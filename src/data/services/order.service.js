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
    sequelize
} from "../models";
import { NotificationType, OrderStatus } from "../../common/utils/status";
import { UserRoles } from "../../common/utils/roles";

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