import { Op } from "sequelize";
import HttpErrors from "../../common/errors/http-errors";
import { ResponseModel } from "../../common/errors/response"
import {
    Coupon,
    Product,
    ProductVariant,
    UserCoupon,
    Order,
    OrderShop,
    OrderItem,
    Address,
    Cart,
    CartShop,
    Shop,
    Color,
    Size,
    City,
    District,
    Ward,
    Notification,
    User,
    sequelize,
    Sequelize
} from "../models";
import { NotificationType, OrderStatus } from "../../common/utils/status";
import { UserRoles } from "../../common/utils/roles";
import { raw } from "body-parser";

export const createOrderMobile = async (user_id, cartInfo) => {
    const t = await sequelize.transaction();
    try {
        /** 1. Kiểm tra đầu vào */
        if (!user_id || Object.keys(cartInfo).length === 0) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                user_id: user_id ?? '',
                cartInfo: cartInfo
            })
        }

        const {
            address_id,
            cart_shops, /** CartShopFinalType[] FE */
            subtotal,
            discount,
            final_total
        } = cartInfo;

        if (address_id) {
            const address = await Address.findOne({
                where: { id: address_id, userId: user_id },
                transaction: t
            });
            if (!address) {
                ResponseModel.error(HttpErrors.BAD_REQUEST, 'Địa chỉ không hợp lệ', { address_id });
            }
        }

        /** 2. Tạo Order */
        const date = new Date();
        const order = await Order.create({
            user_id: user_id,
            address_id: address_id ? address_id : null,
            total_price: final_total,
            status: OrderStatus.PENDING,
            status_changed_at: date,
            payment_date: date
        }, { transaction: t });

        /** 3. Tạo OrderShop và OrderItem */
        const orderShops = [];
        for (const cart_shop of cart_shops) {
            const {
                cart_shop_id, /** Có vẻ không dùng */
                shop, /** ShopModel FE */
                cart_items,
                selected_coupon, /** CouponModel FE */
                shop_total,
                shop_discount,
                shop_final_total
            } = cart_shop;

            /** Kiểm tra tồn kho */
            for (const item of cart_items) {
                if (!item.product_variant?.id || !item.product_variant?.product?.id) {
                    await t.rollback();
                    ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thông tin sản phẩm không hợp lệ', { item });
                }
                console.log(item.product_variant.id);
                const variant = await ProductVariant.findOne({
                    where: { id: item.product_variant.id },
                    transaction: t
                });
                if (!variant || variant.stock_quantity < item.quantity) {
                    await t.rollback();
                    ResponseModel.error(
                        HttpErrors.BAD_REQUEST,
                        `Sản phẩm ${item.product_variant.id} không đủ tồn kho`,
                        {}
                    );
                }
            }

            /** Kiểm tra coupon (nếu có) */
            let finalCouponId = selected_coupon ? selected_coupon.id : null;
            let finalDiscountShop = shop_discount;
            let finalTotalShop = shop_final_total;

            if (finalCouponId) {
                const coupon = await Coupon.findOne({
                    where: {
                        id: finalCouponId,
                        [Op.or]: [
                            { valid_from: { [Op.lte]: new Date() } },
                            { valid_from: null }
                        ],
                        [Op.or]: [
                            { valid_to: { [Op.gte]: new Date() } },
                            { valid_to: null }
                        ],
                        [Op.or]: [
                            { max_usage: null },
                            { max_usage: -1 },
                            { max_usage: { [Op.gt]: sequelize.col('times_used') } }
                        ]
                    },
                    transaction: t
                });

                if (!coupon) {
                    finalCouponId = null;
                    finalDiscountShop = 0;
                    finalTotalShop = shop_total;
                    console.warn(`KM ${selected_coupon.id} không hợp lệ (ngoài thời gian hiệu lực hoặc hết lượt)`);
                } else {
                    /** Kiểm tra UserCoupon */
                    const userCoupon = await UserCoupon.findOne({
                        where: {
                            user_id: user_id,
                            coupon_id: coupon.id,
                            is_used: false
                        },
                        transaction: t
                    });

                    if (!userCoupon) {
                        finalCouponId = null;
                        finalDiscountShop = 0;
                        finalTotalShop = shop_total;
                        console.warn(`UserCoupon KM ${coupon.id} không hợp lệ hoặc đã sử dụng`);
                    } else {
                        /** Kiểm tra min_order_value */
                        if (shop_total < coupon.min_order_value) {
                            finalCouponId = null;
                            finalDiscountShop = 0;
                            finalTotalShop = shop_total;
                            console.warn(`Coupon ${coupon.id} không đủ min_order_value`);
                        }
                    }
                }
            }
            /** Tạo OrderShop */
            const orderShop = await OrderShop.create({
                order_id: order.id,
                shop_id: shop.id,
                coupon_id: finalCouponId,
                subtotal: shop_total,
                discount: finalDiscountShop,
                final_total: finalTotalShop
            }, { transaction: t });

            /** Tạo OrderItems */
            const orderItems = cart_items.map(item => ({
                order_shop_id: orderShop.id,
                product_variant_id: item.product_variant.id,
                quantity: item.quantity
            }));
            await OrderItem.bulkCreate(orderItems, {
                transaction: t
            });

            /** Cập nhật tồn kho */
            for (const item of cart_items) {
                await ProductVariant.update(
                    { stock_quantity: sequelize.literal(`stock_quantity - ${item.quantity}`), },
                    {
                        where: { id: item.product_variant.id },
                        transaction: t
                    }
                );
                await Product.update(
                    { sold_quantity: sequelize.literal(`sold_quantity + ${item.quantity}`) },
                    {
                        where: { id: item.product_variant.product.id },
                        transaction: t
                    }
                );
            }

            /** Cập nhật KM Coupon (nếu sử dụng) */
            if (finalCouponId) {
                await Coupon.update(
                    { times_used: sequelize.literal('times_used + 1') },
                    {
                        where: { id: finalCouponId },
                        transaction: t
                    }
                );

                await UserCoupon.update(
                    { is_used: true },
                    {
                        where: {
                            user_id: user_id,
                            coupon_id: finalCouponId
                        },
                        transaction: t
                    }
                )
            };

            orderShops.push(orderShop);
        }

        /** 4. Kiểm tra tổng giá trị */
        const calculatedTotal = orderShops.reduce(
            (sum, order_shop) => sum + order_shop.final_total, 0
        )
        if (Math.abs(calculatedTotal - final_total) > 0.01) {
            await t.rollback();
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Tổng giá trị không khớp', {});
        }

        /** 5. Xóa Cart */
        await CartShop.destroy({
            where: {
                cart_id: {
                    [Op.in]: sequelize.literal(
                        `(SELECT id FROM carts WHERE user_id = ${user_id})`
                    )
                }
            },
            transaction: t
        })

        /** 6. Commit */
        await t.commit();

        return ResponseModel.success('Tạo đơn hàng thành công', {
            orders: [
                {
                    id: order.id,
                    user_id: order.user_id,
                    address_id: order.address_id,
                    total_price: order.total_price,
                    status: order.status,
                    order_shops: orderShops.map(shop => ({
                        id: shop.id,
                        shop_id: shop.shop_id,
                        coupon_id: shop.coupon_id,
                        subtotal: shop.subtotal,
                        discount: shop.discount,
                        final_total: shop.final_total,
                    })),
                    createdAt: order.createdAt
                }
            ],
            subtotal,
            discount,
            final_total,
        });
    } catch (error) {
        await t.rollback();
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const fetchListOrderUser = async (user_id) => {
    const transaction = await sequelize.transaction();
    try {
        if (!user_id) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                user_id: user_id ?? ''
            })
        }

        const orders = await Order.findAll({
            where: { user_id: user_id },
            include: [
                {
                    model: Address,
                    as: 'address',
                    attributes: [
                        'id', 'address_detail', 'name', 'phone',
                        'city_id', 'district_id', 'ward_id'
                    ],
                    required: false,
                    include: [
                        {
                            model: City,
                            as: 'city',
                            attributes: ['id', 'name'],
                        },
                        {
                            model: District,
                            as: 'district',
                            attributes: ['id', 'name'],
                        },
                        {
                            model: Ward,
                            as: 'ward',
                            attributes: ['id', 'name']
                        }
                    ]
                },
                {
                    model: OrderShop,
                    as: 'order_shops',
                    attributes: [
                        'id', 'order_id', 'shop_id', 'coupon_id',
                        'subtotal', 'discount', 'final_total'
                    ],
                    include: [
                        {
                            model: Shop,
                            as: 'shop',
                            attributes: ['id', 'shop_name', 'logo_url']
                        },
                        {
                            model: Coupon,
                            as: 'coupon',
                            attributes: [
                                'id', 'name', 'discount_type', 'discount_value',
                                'max_discount', 'min_order_value'
                            ],
                            required: false
                        },
                        {
                            model: OrderItem,
                            as: 'order_shop_items',
                            attributes: [
                                'id', 'order_shop_id', 'product_variant_id', 'quantity'
                            ],
                            include: [
                                {
                                    model: ProductVariant,
                                    as: 'product_variant',
                                    attributes: [
                                        'id', 'productId', 'colorId', 'sizeId',
                                        'image_url'
                                    ],
                                    include: [
                                        {
                                            model: Product,
                                            as: 'product',
                                            attributes: ['id', 'product_name', 'unit_price'],
                                        },
                                        {
                                            model: Color,
                                            as: 'color',
                                            attributes: ['id', 'color_name']
                                        },
                                        {
                                            model: Size,
                                            as: 'size',
                                            attributes: ['id', 'size_code']
                                        }
                                    ]
                                }
                            ],
                        }
                    ]
                }
            ],
            order: [['createdAt', 'DESC']],
            transaction: transaction
        });

        const formattedOrders = orders.map((order) => ({
            id: order.id,
            total_price: parseFloat(order.total_price),
            status: order.status,
            status_changed_at: order.status_changed_at,
            payment_date: order.payment_date,
            created_at: order.createdAt,
            address: order.address ? {
                id: order.address.id,
                address_detail: order.address.address_detail,
                name: order.address.name,
                phone: order.address.phone,
                city: order.address.city ? { id: order.address.city.id, name: order.address.city.name } : null,
                district: order.address.district ? { id: order.address.district.id, name: order.address.district.name } : null,
                ward: order.address.ward ? { id: order.address.ward.id, name: order.address.ward.name } : null
            } : null,
            order_shops: order.order_shops.map((orderShop) => ({
                id: orderShop.id,
                shop: {
                    id: orderShop.shop.id,
                    shop_name: orderShop.shop.shop_name,
                    logo_url: orderShop.shop.logo_url
                },
                subtotal: parseFloat(orderShop.subtotal),
                discount: parseFloat(orderShop.discount),
                final_total: parseFloat(orderShop.final_total),
                coupon: orderShop.coupon ? {
                    id: orderShop.coupon.id,
                    name: orderShop.coupon.name,
                    discount_type: orderShop.coupon.discount_type,
                    discount_value: parseFloat(orderShop.coupon.discount_value),
                    max_discount: parseFloat(orderShop.coupon.max_discount),
                    min_order_value: parseFloat(orderShop.coupon.min_order_value)
                } : null,
                order_items: orderShop.order_shop_items.map((item) => ({
                    id: item.id,
                    quantity: item.quantity,
                    product_variant: {
                        id: item.product_variant.id,
                        product: {
                            id: item.product_variant.product.id,
                            product_name: item.product_variant.product.product_name,
                            unit_price: parseFloat(item.product_variant.product.unit_price)
                        },
                        color: item.product_variant.color ? {
                            id: item.product_variant.color.id,
                            color_name: item.product_variant.color.color_name
                        } : null,
                        size: item.product_variant.size ? {
                            id: item.product_variant.size.id,
                            size_code: item.product_variant.size.size_code
                        } : null,
                        image_url: item.product_variant.image_url === null ? '' : item.product_variant.image_url
                    }
                }))
            }))
        }));

        await transaction.commit();
        return ResponseModel.success('Danh sách đơn hàng người dùng: ', {
            orders: formattedOrders
        });
    } catch (error) {
        await transaction.rollback();
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const cancelOrderUser = async (user_id, order_id) => {
    const transaction = await sequelize.transaction();
    try {
        if (!user_id || !order_id) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                user_id: user_id ?? '',
                order_id: order_id ?? ''
            })
        }

        const order = await Order.findOne({
            where: {
                id: order_id,
                user_id: user_id
            },
            include: [
                {
                    model: OrderShop,
                    as: 'order_shops',
                    attributes: [
                        'id', 'order_id', 'shop_id', 'coupon_id',
                    ],
                    include: [
                        {
                            model: Shop,
                            as: 'shop',
                            attributes: ['id', 'shop_name', 'logo_url'],
                            include: [
                                {
                                    model: User,
                                    as: 'user',
                                    attributes: ['id', 'shopId', 'roles']
                                }
                            ]
                        },
                        {
                            model: Coupon,
                            as: 'coupon',
                            attributes: [
                                'id', 'name'
                            ],
                            required: false
                        },
                        {
                            model: OrderItem,
                            as: 'order_shop_items',
                            attributes: [
                                'id', 'order_shop_id', 'product_variant_id', 'quantity'
                            ],
                            include: [
                                {
                                    model: ProductVariant,
                                    as: 'product_variant',
                                    attributes: [
                                        'id', 'productId', 'stock_quantity'
                                    ],
                                    include: [
                                        {
                                            model: Product,
                                            as: 'product',
                                            attributes: [
                                                'id', 'product_name', 'sold_quantity'
                                            ],
                                        },
                                    ]
                                }
                            ],
                        }
                    ]
                }
            ],
            transaction: transaction
        });

        if (!order) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Đơn hang không tồn tại hoặc không thuộc về người dùng', {});
        }

        if (![OrderStatus.PENDING, OrderStatus.PAID].includes(order.status)) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Trạng thái đơn hàng không cho phép hủy', {
                order_status: order.status
            })
        }

        for (const orderShop of order.order_shops) {
            for (const orderItem of orderShop.order_shop_items) {
                const productVariant = orderItem.product_variant;
                const product = productVariant.product;
                const quantity = orderItem.quantity;

                if (!productVariant || !product || quantity <= 0) {
                    ResponseModel.error(HttpErrors.INTERNAL_SERVER_ERROR, 'Dữ liệu đơn hàng không hợp lệ', {
                        order_item_id: orderItem.id
                    });
                }

                await productVariant.update({
                    stock_quantity: productVariant.stock_quantity + quantity
                }, { transaction: transaction });

                if (product.sold_quantity >= quantity) {
                    await product.update({
                        sold_quantity: product.sold_quantity - quantity
                    }, { transaction: transaction })
                } else {
                    ResponseModel.error(HttpErrors.INTERNAL_SERVER_ERROR, 'Số lượng đã bán không hợp lệ', {
                        product_id: product.id,
                        sold_quantity: product.sold_quantity,
                        quantity: quantity
                    });
                }
            }

            if (orderShop.coupon) {
                const userCoupon = await UserCoupon.findOne({
                    where: {
                        user_id: user_id,
                        coupon_id: orderShop.coupon.id
                    },
                    transaction: transaction
                })

                if (userCoupon && userCoupon.is_used) {
                    await UserCoupon.update({
                        is_used: false
                    }, {
                        where: {
                            user_id: user_id,
                            coupon_id: orderShop.coupon.id
                        },
                        transaction: transaction
                    })

                    await orderShop.coupon.update({
                        times_used: orderShop.coupon.times_used - 1
                    }, { transaction: transaction })
                }
            }
        }

        await order.update({
            status: OrderStatus.CANCELED,
            status_changed_at: new Date()
        }, { transaction: transaction });

        await Notification.create({
            user_id,
            roles: UserRoles.CUSTOMER,
            type: NotificationType.ORDER,
            title: `Hủy đơn hàng #${order_id}`,
            message: `Đơn hàng #${order_id} của bạn đã được hủy thành công.`,
            is_read: false,
            created_at: new Date()
        }, { transaction });

        for (const orderShop of order.order_shops) {
            const shopOwner = orderShop.shop.user;
            if (shopOwner && shopOwner.roles === UserRoles.OWNER) {
                await Notification.create({
                    user_id: shopOwner.id,
                    roles: UserRoles.OWNER,
                    type: NotificationType.ORDER,
                    title: `Đơn hàng #${order_id} bị hủy`,
                    message: `Đơn hàng #${order_id} từ cửa hàng của bạn đã bị khách hàng hủy.`,
                    is_read: false,
                    created_at: new Date()
                }, { transaction: transaction });
            }
        }

        await transaction.commit();
        return ResponseModel.success('Hủy đơn hàng thành công: ', {});
    } catch (error) {
        await transaction.rollback();
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

/** ADMIN - OWNER **/
export const fetchListShopOrder = async (shop_id, status = null) => {
    try {
        if (!shop_id) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                shop_id: shop_id ?? ''
            })
        }

        /** 1. Điều kiện lọc **/
        const whereClause = { shop_id: shop_id };

        /** 2. Xây dựng include cho Order với điều kiện status nếu có **/
        const orderInclude = {
            model: Order,
            as: 'order',
            attributes: ['id', 'user_id', 'total_price', 'status', 'payment_date', 'status_changed_at'],
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'email', 'phone']
                },
                {
                    model: Address,
                    as: 'address',
                    attributes: ['id', 'name', 'phone', 'address_detail', 'city_id', 'district_id', 'ward_id'],
                    required: false,
                    include: [
                        { model: City, as: 'city', attributes: ['name'] },
                        { model: District, as: 'district', attributes: ['name'] },
                        { model: Ward, as: 'ward', attributes: ['name'] }
                    ]
                }
            ]
        };
        if (status) {
            orderInclude.where = {
                status: status
            }
        }

        const orderShops = await OrderShop.findAll({
            where: whereClause,
            include: [
                orderInclude,
                {
                    model: Coupon,
                    as: 'coupon',
                    attributes: [
                        'id', 'name', 'code', 'discount_type',
                        'discount_value', 'max_discount',
                    ],
                    required: false
                },
                {
                    model: OrderItem,
                    as: 'order_shop_items',
                    attributes: ['id', 'order_shop_id', 'quantity'],
                    include: [
                        {
                            model: ProductVariant,
                            as: 'product_variant',
                            attributes: ['id', 'sku', 'image_url', 'stock_quantity'],
                            include: [
                                {
                                    model: Product,
                                    as: 'product',
                                    attributes: ['id', 'product_name', 'unit_price'],
                                },
                                {
                                    model: Color,
                                    as: 'color',
                                    attributes: ['id', 'color_name', 'color_code'],
                                    required: false
                                },
                                {
                                    model: Size,
                                    as: 'size',
                                    attributes: ['id', 'size_code'],
                                    required: false
                                }
                            ]
                        }
                    ]
                }
            ],
            attributes: [
                'id', 'subtotal', 'discount', 'final_total', 'createdAt'
            ],
            order: [['createdAt', 'DESC']]
        });

        /** 2. Định dạng dữ liệu trả về **/
        const formatedOrders = orderShops.map(orderShop => ({
            id: orderShop.order.id,
            order_shop_id: orderShop.id,
            user: {
                id: orderShop.order.user.id,
                name: orderShop.order.user.name,
                email: orderShop.order.user.email,
                phone: orderShop.order.user.phone
            },
            address: orderShop.order.address ? {
                id: orderShop.order.address.id,
                name: orderShop.order.address.name,
                phone: orderShop.order.address.phone,
                address_detail: orderShop.order.address.address_detail,
                city: orderShop.order.address?.city ? orderShop.order.address.city : undefined,
                district: orderShop.order.address?.district ? orderShop.order.address.district : undefined,
                ward: orderShop.order.address?.ward ? orderShop.order.address.ward : undefined,
            } : undefined,
            subtotal: parseFloat(orderShop.subtotal),
            discount: parseFloat(orderShop.discount),
            final_total: parseFloat(orderShop.final_total),
            status: orderShop.order.status,
            payment_date: orderShop.order.payment_date,
            status_changed_at: orderShop.order.status_changed_at,
            created_at: orderShop.createdAt,
            coupon: orderShop.coupon ? {
                id: orderShop.coupon.id,
                name: orderShop.coupon.name,
                code: orderShop.coupon.code,
                discountType: orderShop.coupon.discount_type,
                discountValue: parseFloat(orderShop.coupon.discount_value),
                maxDiscount: parseFloat(orderShop.coupon.max_discount)
            } : undefined,
            order_items: orderShop.order_shop_items.map(item => ({
                id: item.id,
                order_shop: {
                    id: orderShop.id
                },
                quantity: item.quantity,
                productVariant: {
                    id: item.product_variant.id,
                    sku: item.product_variant.sku,
                    imageUrl: item.product_variant.image_url,
                    stockQuantity: item.product_variant.stock_quantity,
                    product: {
                        id: item.product_variant.product.id,
                        name: item.product_variant.product.product_name,
                        unitPrice: parseFloat(item.product_variant.product.unit_price)
                    },
                    color: item.product_variant.color ? {
                        id: item.product_variant.color.id,
                        color_name: item.product_variant.color.color_name,
                        color_code: item.product_variant.color.color_code
                    } : undefined,
                    size: item.product_variant.size ? {
                        id: item.product_variant.size.id,
                        size_code: item.product_variant.size.size_code
                    } : undefined
                }
            }))
        }))

        return ResponseModel.success('Danh sách đơn hàng của cửa hàng: ', {
            orders: [formatedOrders]
        });
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

// Tổng quan cửa hàng 
export const fetchShopOverview = async (shop_id, { startDate, endDate }) => {
    try {

        if (!shop_id || !startDate || !endDate) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                shop_id: shop_id ?? '',
                startDate: startDate ?? '',
                endDate: endDate ?? ''
            });
        }

        /** 1. Truy vấn tổng doanh thu và số đơn hàng **/
        const orderShopStats = await OrderShop.findAll({
            where: {
                shop_id: shop_id,
                createdAt: {
                    [Op.between]: [startDate, endDate]
                },
            },
            include: [
                {
                    model: Order,
                    as: 'order',
                    attributes: ['id', 'status'],
                    where: {
                        status: {
                            [Op.ne]: OrderStatus.CANCELED
                        }
                    }
                }
            ],
            attributes: [
                [Sequelize.fn('SUM', Sequelize.col('final_total')), 'totalRevenue'],
                [Sequelize.fn('COUNT', Sequelize.col('OrderShop.id')), 'totalOrders']
            ],
            raw: true
        })

        console.log('aaaa');

        /** 2. Truy vấn số đơn hàng theo trạng thái **/
        const statusStats = await OrderShop.findAll({
            where: {
                shop_id: shop_id,
                createdAt: {
                    [Op.between]: [startDate, endDate]
                }
            },
            include: [
                {
                    model: Order,
                    as: 'order',
                    attributes: ['id', 'status'],
                }
            ],
            attributes: [
                [Sequelize.col('order.status'), 'status'],
                [Sequelize.fn('COUNT', Sequelize.col('OrderShop.id')), 'count']
            ],
            group: ['order.status'],
            raw: true
        })

        /** 3. Truy vấn tổng số sản phẩm bán ra **/
        const productStats = await OrderItem.findAll({
            where: {
                '$order_shop.shop_id$': shop_id,
                '$order_shop.createdAt$': {
                    [Op.between]: [startDate, endDate]
                },
                '$order_shop.order.status$': {
                    [Op.ne]: OrderStatus.CANCELED
                }
            },
            include: [
                {
                    model: OrderShop,
                    as: 'order_shop',
                    attributes: ['shop_id', 'createdAt'],
                    include: [
                        {
                            model: Order,
                            as: 'order',
                            attributes: ['status']
                        }
                    ]
                }
            ],
            attributes: [
                [Sequelize.fn('SUM', Sequelize.col('quantity')), 'totalSoldProducts'],
            ],
            raw: true
        })

        /** 4. Truy vấn số khách hàng **/
        const customerStats = await OrderShop.findAll({
            where: {
                shop_id: shop_id,
                createdAt: {
                    [Op.between]: [startDate, endDate]
                },
                '$order.status$': {
                    [Op.ne]: OrderStatus.CANCELED
                }
            },
            include: [
                {
                    model: Order,
                    as: 'order',
                    attributes: ['id', 'status', 'user_id']
                }
            ],
            attributes: [
                [
                    Sequelize.fn(
                        'COUNT',
                        Sequelize.fn(
                            'DISTINCT',
                            Sequelize.col('order.user_id')
                        )
                    ), 'totalCustomers'
                ]
            ],
            raw: true
        })

        /** 5. Định dạng dữ liệu trả về **/
        const overview = {
            totalRevenue: parseFloat(orderShopStats[0]?.totalRevenue || 0),
            totalOrders: parseInt(orderShopStats[0]?.totalOrders || 0),
            totalSoldProducts: parseInt(productStats[0]?.totalSoldProducts || 0),
            totalCustomers: parseInt(customerStats[0]?.totalCustomers || 0),
            orderStatusCounts: statusStats.reduce((acc, stat) => {
                acc[stat.status] = parseInt(stat.count || 0);
                return acc;
            }, {
                [OrderStatus.PENDING]: 0,
                [OrderStatus.PAID]: 0,
                [OrderStatus.SHIPPED]: 0,
                [OrderStatus.COMPLETED]: 0,
                [OrderStatus.CANCELED]: 0
            })
        }

        return ResponseModel.success('Thống kê tổng quan cửa hàng', {
            overview: overview
        });

    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

// Thống kê doanh thu theo thời gian
export const fetchRevenueOverTime = async (shop_id, { startDate, endDate, groupBy = 'day' }) => {
    try {

        if (!shop_id || !startDate || !endDate || !['day', 'week', 'month'].includes(groupBy)) {
            return ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu hoặc sai thông tin', {
                shop_id: shop_id ?? '',
                startDate: startDate ?? '',
                endDate: endDate ?? '',
                groupBy: groupBy ?? ''
            });
        }

        const groupByExpression = {
            day: Sequelize.fn('DATE', Sequelize.col('OrderShop.createdAt')),
            week: Sequelize.fn('DATE_FORMAT', Sequelize.col('OrderShop.createdAt'), '%Y-%u'), // Năm và tuần
            month: Sequelize.fn('DATE_FORMAT', Sequelize.col('OrderShop.createdAt'), '%Y-%m') // Năm và tháng
        }[groupBy];

        const groupByAlias = {
            day: Sequelize.fn('DATE', Sequelize.col('OrderShop.createdAt')),
            week: Sequelize.fn('DATE_FORMAT', Sequelize.col('OrderShop.createdAt'), '%Y-%u'),
            month: Sequelize.fn('DATE_FORMAT', Sequelize.col('OrderShop.createdAt'), '%Y-%m')
        }[groupBy];

        const revenueData = await OrderShop.findAll({
            where: {
                shop_id: shop_id,
                createdAt: {
                    [Op.between]: [startDate, endDate]
                },
                '$order.status$': {
                    [Op.ne]: OrderStatus.CANCELED
                }
            },
            include: [
                {
                    model: Order,
                    as: 'order',
                    attributes: ['id', 'status']
                }
            ],
            attributes: [
                [groupByExpression, 'period'],
                [Sequelize.fn('SUM', Sequelize.col('final_total')), 'revenue']
            ],
            group: [groupByAlias],
            order: [[Sequelize.col('period'), 'ASC']],
            raw: true
        })

        const formattedData = revenueData.map(item => ({
            period: item.period, // Ví dụ: "2025-05-01" (day), "2025-19" (week), "2025-05" (month)
            revenue: parseFloat(item.revenue || 0)
        }));

        return ResponseModel.success('Thống kê doanh thu theo thời gian', {
            revenues: formattedData,
            totalRevenue: formattedData.reduce((sum, item) => sum + item.revenue, 0)
        });
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

// Thông kê đơn hàng gồm số lượng đơn hàng theo trạng thái hoặc nhóm theo thời gian
export const fetchOrderStats = async (shop_id, { startDate, endDate, groupBy = 'day', status = null }) => {
    try {
        if (!shop_id || !startDate || !endDate || !['day', 'week', 'month'].includes(groupBy)) {
            return ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu hoặc sai thông tin', {
                shop_id: shop_id ?? '',
                startDate: startDate ?? '',
                endDate: endDate ?? '',
                groupBy: groupBy ?? ''
            });
        }

        const whereClause = {
            shop_id: shop_id,
            createdAt: { [Op.between]: [startDate, endDate] }
        };

        const orderInclude = {
            model: Order,
            as: 'order',
            attributes: ['id', 'status']
        };
        if (status) {
            orderInclude.where = { status };
        }

        const groupByExpression = {
            day: Sequelize.fn('DATE', Sequelize.col('OrderShop.createdAt')),
            week: Sequelize.fn('DATE_FORMAT', Sequelize.col('OrderShop.createdAt'), '%Y-%u'),
            month: Sequelize.fn('DATE_FORMAT', Sequelize.col('OrderShop.createdAt'), '%Y-%m')
        }[groupBy];

        const orderData = await OrderShop.findAll({
            where: whereClause,
            include: [orderInclude],
            attributes: [
                [groupByExpression, 'period'],
                [Sequelize.col('order.status'), 'status'],
                [Sequelize.fn('COUNT', Sequelize.col('OrderShop.id')), 'count']
            ],
            group: [groupByExpression, 'order.status'],
            order: [[Sequelize.col('period'), 'ASC']],
            raw: true
        });

        const statusCounts = await OrderShop.findAll({
            where: whereClause,
            include: [{ model: Order, as: 'order', attributes: ['id', 'status'] }],
            attributes: [
                [Sequelize.col('order.status'), 'status'],
                [Sequelize.fn('COUNT', Sequelize.col('OrderShop.id')), 'count']
            ],
            group: ['order.status'],
            raw: true
        });

        const formattedData = orderData.reduce((acc, item) => {
            if (!acc[item.period]) {
                acc[item.period] = { period: item.period, counts: {} };
            }
            acc[item.period].counts[item.status] = parseInt(item.count || 0);
            return acc;
        }, {});

        return ResponseModel.success('Thống kê đơn hàng', {
            ordersByPeriod: Object.values(formattedData),
            statusCounts: statusCounts.reduce((acc, stat) => {
                acc[stat.status] = parseInt(stat.count || 0);
                return acc;
            }, { pending: 0, paid: 0, shipped: 0, completed: 0, canceled: 0 }),
            totalOrders: statusCounts.reduce((sum, stat) => sum + parseInt(stat.count || 0), 0)
        });
    } catch (error) {
        return ResponseModel.error(error?.status || 500, error?.message || 'Lỗi khi lấy thống kê đơn hàng', error?.body);
    }
};

// Thống kê sản phẩm bán chạy
export const fetchTopSellingProducts = async (shop_id, { startDate, endDate, limit = 10 }) => {
    try {
        if (!shop_id || !startDate || !endDate) {
            return ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                shop_id: shop_id ?? '',
                startDate: startDate ?? '',
                endDate: endDate ?? '',
            });
        }

        const topProducts = await OrderItem.findAll({
            where: {
                '$order_shop.shop_id$': shop_id,
                '$order_shop.createdAt$': {
                    [Op.between]: [startDate, endDate]
                },
                '$order_shop.order.status$': {
                    [Op.ne]: OrderStatus.CANCELED
                }
            },
            include: [
                {
                    model: OrderShop,
                    as: 'order_shop',
                    attributes: ['id', 'shop_id', 'order_id', 'createdAt'],
                    include: [
                        {
                            model: Order,
                            as: 'order',
                            attributes: ['id', 'status']
                        }
                    ],
                },
                {
                    model: ProductVariant,
                    as: 'product_variant',
                    attributes: ['id', 'sku', 'image_url', 'productId'],
                    include: [
                        {
                            model: Product,
                            as: 'product',
                            attributes: ['id', 'product_name', 'unit_price']
                        },
                        {
                            model: Color,
                            as: 'color',
                            attributes: ['id', 'color_name', 'color_code'],
                            required: false
                        },
                        {
                            model: Size,
                            as: 'size',
                            attributes: ['id', 'size_code'],
                            required: false
                        }
                    ]
                }
            ],
            attributes: [
                [Sequelize.fn('SUM', Sequelize.col('quantity')), 'totalQuantity'],
                [Sequelize.fn('SUM', Sequelize.literal('`OrderItem`.`quantity` * `product_variant->product`.`unit_price`')), 'totalRevenue']
            ],
            group: [
                'product_variant.id',
                'product_variant.sku',
                'product_variant.image_url',
                'product_variant->product.id',
                'product_variant->product.product_name',
                'product_variant->product.unit_price',
                'product_variant->color.id',
                'product_variant->color.color_name',
                'product_variant->color.color_code',
                'product_variant->size.id',
                'product_variant->size.size_code'
            ],
            order: [[Sequelize.literal('totalQuantity'), 'DESC']],
            limit,
            raw: true
        })

        const formattedProducts = topProducts.map(product => ({
            id: product['product_variant.id'],
            product_variant_id: product['product_variant.id'],
            sku: product['product_variant.sku'],
            imageUrl: product['product_variant.image_url'],
            product: {
                id: product['product_variant.product.id'],
                name: product['product_variant.product.product_name'],
                unitPrice: parseFloat(product['product_variant.product.unit_price'] || 0)
            },
            color: product['product_variant.color.color_name'] ? {
                id: product['product_variant.color.id'],
                color_name: product['product_variant.color.color_name'],
                color_code: product['product_variant.color.color_code']
            } : undefined,
            size: product['product_variant.size.size_code'] ? {
                id: product['product_variant.size.id'],
                size_code: product['product_variant.size.size_code']
            } : undefined,
            totalQuantity: parseInt(product.totalQuantity || 0),
            totalRevenue: parseFloat(product.totalRevenue || 0)
        }));

        return ResponseModel.success('Danh sách sản phẩm bán chạy', {
            products: formattedProducts
        });
    } catch (error) {
        return ResponseModel.error(error?.status || 500, error?.message || 'Lỗi khi lấy thống kê đơn hàng', error?.body);
    }
};