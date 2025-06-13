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
import { DiscountTypes, NotificationActionType, NotificationReferenceType, NotificationType, OrderStatus } from "../../common/utils/status";
import { UserRoles } from "../../common/utils/roles";
import { pushNotificationUser } from "../../common/utils/socket.service";

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
            payment_date: null
        }, { transaction: t });

        /** 3. Tạo OrderShop và OrderItem */
        const orderShops = [];
        const currentTime = new Date();
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
                        [Op.and]: [
                            {
                                [Op.or]: [
                                    { valid_from: { [Op.lte]: currentTime } },
                                    { valid_from: null }
                                ]
                            },
                            {
                                [Op.or]: [
                                    { valid_to: { [Op.gte]: currentTime } },
                                    { valid_to: null }
                                ]
                            },
                            {
                                [Op.or]: [
                                    { max_usage: null },
                                    { max_usage: -1 },
                                    { max_usage: { [Op.gt]: Sequelize.col('times_used') } }
                                ]
                            }
                        ]
                    },
                    transaction: t
                });
                console.log(coupon);
                if (!coupon) {
                    ResponseModel.error(
                        HttpErrors.BAD_REQUEST,
                        `Tồn tại mã khuyến mãi không hợp lệ hoặc đã hết hạn`,
                        { coupon_id: finalCouponId }
                    );
                }
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
                    ResponseModel.error(
                        HttpErrors.BAD_REQUEST,
                        `Tồn tại mã khuyến mãi đã sử dụng hoặc không tồn tại`,
                        { coupon_id: finalCouponId }
                    );
                }
                /** Kiểm tra min_order_value */
                if (shop_total < coupon.min_order_value) {
                    ResponseModel.error(
                        HttpErrors.BAD_REQUEST,
                        `Đơn hàng không đủ giá trị tối thiểu để áp dụng mã khuyến mãi ${coupon.id}`,
                        { min_order_value: coupon.min_order_value }
                    );
                }

                /** Kiểm tra tính toán giảm giá */
                let calculatedDiscount = 0;
                if (coupon.discount_type === DiscountTypes.PERCENTAGE) {
                    calculatedDiscount = (shop_total * coupon.discount_value) / 100;
                    if (coupon.max_discount && calculatedDiscount > coupon.max_discount) {
                        calculatedDiscount = coupon.max_discount;
                    }
                } else if (coupon.discount_type === DiscountTypes.FIXED) {
                    calculatedDiscount = coupon.discount_value;
                }

                if (Math.abs(calculatedDiscount - shop_discount) > 0.01 || shop_final_total !== Math.max(0, shop_total - calculatedDiscount)) {
                    ResponseModel.error(
                        HttpErrors.BAD_REQUEST,
                        `Giá trị giảm giá hoặc tổng tiền cửa hàng không khớp với mã khuyến mãi`,
                        { coupon_id: finalCouponId }
                    );
                }
            } else if (shop_discount > 0 || shop_final_total !== shop_total) {
                ResponseModel.error(
                    HttpErrors.BAD_REQUEST,
                    `Thông tin giảm giá không hợp lệ khi không sử dụng mã khuyến mãi`,
                    { shop_discount, shop_final_total }
                );
            }
            /** Tạo OrderShop */
            const orderShop = await OrderShop.create({
                order_id: order.id,
                shop_id: shop.id,
                coupon_id: finalCouponId,
                subtotal: shop_total,
                discount: finalDiscountShop,
                final_total: finalTotalShop,
                status: OrderStatus.PENDING
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
        });

        /** 6. Commit */
        await t.commit();

        /** 7. Tạo thông báo **/
        const existingCustomerNotification = await Notification.findOne({
            where: {
                user_id: user_id,
                type: NotificationType.ORDER_NEW,
                reference_id: order.id,
                is_read: false
            }
        });

        if (!existingCustomerNotification) {
            const customerNotification = await Notification.create({
                user_id,
                roles: UserRoles.CUSTOMER,
                type: NotificationType.ORDER_NEW,
                reference_id: order.id,
                reference_type: NotificationReferenceType.ORDER,
                data: {
                    order_id: order.id,
                    order_total: final_total
                },
                action: NotificationActionType.VIEW_ORDER,
                is_read: false,
            });
            /** => Sau bắn socket **/
            try {
                const notificationPayload = {
                    type: 'notification',
                    notification: {
                        id: customerNotification.id,
                        user_id: customerNotification.user_id,
                        roles: customerNotification.roles,
                        type: customerNotification.type,
                        reference_id: customerNotification.reference_id,
                        reference_type: customerNotification.reference_type,
                        data: customerNotification.data,
                        action: customerNotification.action,
                        is_read: customerNotification.is_read,
                        created_at: customerNotification.createdAt
                    }
                };
                pushNotificationUser(user_id, notificationPayload);
            } catch (socketError) {
                console.error('Failed to emit socket notification for customer:', socketError);
            }
        }

        // Thông báo cho chủ cửa hàng
        for (const orderShop of orderShops) {
            const shop = await Shop.findOne({
                where: { id: orderShop.shop_id },
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['id', 'roles']
                }]
            });

            const shopOwner = shop?.user;
            if (shopOwner && shopOwner.roles === UserRoles.OWNER) {
                const existingOwnerNotification = await Notification.findOne({
                    where: {
                        user_id: shopOwner.id,
                        type: NotificationType.ORDER_NEW,
                        reference_id: orderShop.id,
                        is_read: false
                    }
                });

                if (!existingOwnerNotification) {
                    const ownerNotification = await Notification.create({
                        user_id: shopOwner.id,
                        roles: UserRoles.OWNER,
                        type: NotificationType.ORDER_NEW,
                        reference_id: orderShop.id,
                        reference_type: NotificationReferenceType.ORDER,
                        data: {
                            order_id: order.id,
                            shop_name: shop.shop_name,
                            customer_id: user_id,
                            shop_total: orderShop.final_total
                        },
                        action: NotificationActionType.VIEW_ORDER,
                        is_read: false,
                    });
                    /** => Sau bắn socket **/
                    try {
                        const notificationPayload = {
                            type: 'notification',
                            notification: {
                                id: ownerNotification.id,
                                user_id: ownerNotification.user_id,
                                roles: ownerNotification.roles,
                                type: ownerNotification.type,
                                reference_id: ownerNotification.reference_id,
                                reference_type: ownerNotification.reference_type,
                                data: ownerNotification.data,
                                action: ownerNotification.action,
                                is_read: ownerNotification.is_read,
                                created_at: ownerNotification.createdAt
                            }
                        };

                        pushNotificationUser(shopOwner.id, notificationPayload);
                    } catch (socketError) {
                        console.error('Failed to emit socket notification for owner:', socketError);
                    }
                }
            }
        }

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
                        'id', 'order_id', 'shop_id', 'coupon_id', 'status'
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

            await orderShop.update({
                status: OrderStatus.CANCELED
            }, { transaction: transaction })
        }

        await order.update({
            status: OrderStatus.CANCELED,
            status_changed_at: new Date()
        }, { transaction: transaction });

        /** Kiểm tra và tạo thông báo tới khách hàng **/
        const existingCustomerNotification = await Notification.findOne({
            where: {
                user_id: user_id,
                type: NotificationType.ORDER_CANCELED,
                reference_id: order_id,
                is_read: false
            },
            transaction
        });

        if (!existingCustomerNotification) {
            const customerNotification = await Notification.create({
                user_id,
                roles: UserRoles.CUSTOMER,
                type: NotificationType.ORDER_CANCELED,
                reference_id: order_id,
                reference_type: NotificationReferenceType.ORDER,
                data: {
                    order_id: order_id,
                    reason: 'Hủy bởi người dùng'
                },
                action: NotificationActionType.VIEW_ORDER,
                is_read: false,
            }, { transaction });
            /** => Sau bắn socket **/
            try {
                const notificationPayload = {
                    type: 'notification',
                    notification: {
                        id: customerNotification.id,
                        user_id: customerNotification.user_id,
                        roles: customerNotification.roles,
                        type: customerNotification.type,
                        reference_id: customerNotification.reference_id,
                        reference_type: customerNotification.reference_type,
                        data: customerNotification.data,
                        action: customerNotification.action,
                        is_read: customerNotification.is_read,
                        created_at: customerNotification.createdAt
                    }
                };
                pushNotificationUser(user_id, notificationPayload);
            } catch (socketError) {
                console.error('Failed to emit socket notification for customer:', socketError);
            }
        }

        for (const orderShop of order.order_shops) {
            const shopOwner = orderShop.shop.user;
            if (shopOwner && shopOwner.roles === UserRoles.OWNER) {
                const existingOwnerNotification = await Notification.findOne({
                    where: {
                        user_id: shopOwner.id,
                        type: NotificationType.ORDER_CANCELED,
                        reference_id: orderShop.id,
                        is_read: false
                    },
                    transaction
                });

                if (!existingOwnerNotification) {
                    const ownerNotification = await Notification.create({
                        user_id: shopOwner.id,
                        roles: UserRoles.OWNER,
                        type: NotificationType.ORDER_CANCELED,
                        reference_id: orderShop.id,
                        reference_type: NotificationReferenceType.ORDER,
                        data: {
                            order_id: order_id,
                            shop_name: orderShop.shop.shop_name,
                            customer_id: user_id,
                        },
                        action: NotificationActionType.VIEW_ORDER,
                        is_read: false,
                    }, { transaction: transaction });

                    /** => Sau bắn socket **/
                    try {
                        const notificationPayload = {
                            type: 'notification',
                            notification: {
                                id: ownerNotification.id,
                                user_id: ownerNotification.user_id,
                                roles: ownerNotification.roles,
                                type: ownerNotification.type,
                                reference_id: ownerNotification.reference_id,
                                reference_type: ownerNotification.reference_type,
                                data: ownerNotification.data,
                                action: ownerNotification.action,
                                is_read: ownerNotification.is_read,
                                created_at: ownerNotification.createdAt
                            }
                        };
                        pushNotificationUser(shopOwner.id, notificationPayload);
                    } catch (socketError) {
                        console.error('Failed to emit socket notification for customer:', socketError);
                    }
                }
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
/**
 * Lấy danh sách đơn hàng của cửa hàng
 * @param {number} shop_id - ID của cửa hàng
 * @param {string|null} status - Trạng thái đơn hàng cửa hàng (pending, paid, processing, shipped, completed, canceled)
 * @returns {Promise<Object>} - Phản hồi chứa danh sách đơn hàng
 */

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
            attributes: [
                'id', 'user_id', 'total_price', 'status',
                'payment_date', 'status_changed_at'
            ],
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'email', 'phone']
                },
                {
                    model: Address,
                    as: 'address',
                    attributes: [
                        'id', 'name', 'phone', 'address_detail',
                        'city_id', 'district_id', 'ward_id'
                    ],
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
            whereClause.status = status;
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
                'id', 'subtotal', 'discount', 'status', 'final_total', 'createdAt'
            ],
            order: [['createdAt', 'DESC']]
        });

        /** 2. Định dạng dữ liệu trả về **/
        const formattedOrders = orderShops.map(orderShop => ({
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
                ward: orderShop.order.address?.ward ? orderShop.order.address.ward : undefined
            } : undefined,
            subtotal: parseFloat(orderShop.subtotal),
            discount: parseFloat(orderShop.discount),
            final_total: parseFloat(orderShop.final_total),
            status: orderShop.status, // Sử dụng status của OrderShop
            payment_date: orderShop.order.payment_date,
            status_changed_at: orderShop.order.status_changed_at,
            created_at: orderShop.createdAt,
            coupon: orderShop.coupon ? {
                id: orderShop.coupon.id,
                name: orderShop.coupon.name,
                code: orderShop.coupon.code,
                discount_type: orderShop.coupon.discount_type,
                discount_value: parseFloat(orderShop.coupon.discount_value),
                maxDiscount: parseFloat(orderShop.coupon.max_discount)
            } : undefined,
            order_items: orderShop.order_shop_items.map(item => ({
                id: item.id,
                order_shop: {
                    id: orderShop.id
                },
                quantity: item.quantity,
                product_variant: {
                    id: item.product_variant.id,
                    sku: item.product_variant.sku,
                    image_url: item.product_variant.image_url,
                    stock_quantity: item.product_variant.stock_quantity,
                    product: {
                        id: item.product_variant.product.id,
                        name: item.product_variant.product.product_name,
                        unit_price: parseFloat(item.product_variant.product.unit_price)
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
        }));

        return ResponseModel.success('Danh sách đơn hàng của cửa hàng: ', {
            orders: formattedOrders
        });
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const updateStatusOrder = async (order_shop_id, status) => {
    const transaction = await sequelize.transaction();
    try {
        if (!order_shop_id || !status) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                order_shop_id: order_shop_id ?? '',
                status: status ?? ''
            })
        }

        const validStatuses = [
            OrderStatus.PROCESSING,
            OrderStatus.SHIPPED
        ];

        if (!validStatuses.includes(status)) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Trạng thái không hợp lệ', {
                status,
                validStatuses
            });
        }

        const orderShop = await OrderShop.findOne({
            where: {
                id: order_shop_id,
                status: {
                    [Op.or]: [
                        OrderStatus.PENDING,
                        OrderStatus.PAID,
                        OrderStatus.PROCESSING,
                        OrderStatus.SHIPPED
                    ]
                }
            },
            attributes: ['id', 'status', 'order_id'],
            transaction: transaction
        })

        if (!orderShop) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Đơn hàng không tồn tại hoặc không thể thay đổi trạng thái', {
                order_shop_id
            });
        }

        await orderShop.update({ status }, { transaction });

        const order_id = orderShop.order_id;
        const order_shops = await OrderShop.findAll({
            where: { order_id },
            attributes: ['id', 'status', 'shop_id', 'final_total'],
            include: [
                {
                    model: Shop,
                    as: 'shop',
                    attributes: ['id', 'balance']
                }
            ],
            transaction
        });

        const allShipped = order_shops.every(os => os.status === OrderStatus.SHIPPED);

        if (allShipped) {
            await Order.update(
                { status: OrderStatus.COMPLETED },
                { where: { id: order_id }, transaction }
            );

            await OrderShop.update(
                { status: OrderStatus.COMPLETED },
                { where: { order_id: order_id }, transaction }
            );

            await Promise.all(order_shops.map(async (order_shop) => {
                const shop = order_shop.shop;
                const final_total = order_shop.final_total;

                await shop.increment('balance', {
                    by: final_total,
                    transaction
                });
            }))
        }

        await transaction.commit();

        return ResponseModel.success(`Đơn hàng #${order_shop_id} đã được cập nhật thành ${status}`, {});
    } catch (error) {
        await transaction.rollback();
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const fetchListOrderForAdmin = async () => {
    try {
        const orders = await Order.findAll({
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'email', 'phone']
                },
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
                        'id', 'order_id', 'shop_id', 'status', 'coupon_id',
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
            order: [['createdAt', 'DESC']]
        });

        // Định dạng dữ liệu trả về
        const formattedOrders = orders.map((order) => ({
            id: order.id,
            total_price: parseFloat(order.total_price),
            status: order.status,
            status_changed_at: order.status_changed_at,
            payment_date: order.payment_date,
            created_at: order.createdAt,
            user: order.user ? {
                id: order.user.id,
                name: order.user.name,
                email: order.user.email,
                phone: order.user.phone
            } : undefined,
            address: order.address ? {
                id: order.address.id,
                address_detail: order.address.address_detail,
                name: order.address.name,
                phone: order.address.phone,
                city: order.address.city ? { id: order.address.city.id, name: order.address.city.name } : null,
                district: order.address.district ? { id: order.address.district.id, name: order.address.district.name } : null,
                ward: order.address.ward ? { id: order.address.ward.id, name: order.address.ward.name } : null
            } : undefined,
            order_shops: order.order_shops.map((orderShop) => ({
                id: orderShop.id,
                shop: {
                    id: orderShop.shop.id,
                    shop_name: orderShop.shop.shop_name,
                    logo_url: orderShop.shop.logo_url
                },
                status: orderShop.status,
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
                } : undefined,
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
                        } : undefined,
                        size: item.product_variant.size ? {
                            id: item.product_variant.size.id,
                            size_code: item.product_variant.size.size_code
                        } : undefined,
                        image_url: item.product_variant.image_url === null ? '' : item.product_variant.image_url
                    }
                }))
            }))
        }));

        return ResponseModel.success('Lấy danh sách Order thành công', {
            orders: formattedOrders
        });
    } catch (error) {
        ResponseModel.error(
            error?.status ?? HttpErrors.INTERNAL_SERVER_ERROR,
            error?.message ?? 'Lỗi khi lấy danh sách Order',
            error?.body ?? {}
        );
    }
};

/**
 * API lấy chi tiết một đơn hàng của cửa hàng trong đơn hàng chính
 * @param {number} order_id - ID của đơn hàng chính
 * @param {number} order_shop_id - ID của đơn hàng cửa hàng
 * @returns {Promise<Object>} - Phản hồi chứa chi tiết đơn hàng cửa hàng
 */
export const fetchOrderShopDetail = async (order_id, order_shop_id) => {
    try {
        if (!order_id || !order_shop_id) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                order_id: order_id ?? '',
                order_shop_id: order_shop_id ?? ''
            });
        }

        const orderShop = await OrderShop.findOne({
            where: {
                id: order_shop_id,
                order_id: order_id // Đảm bảo OrderShop thuộc Order
            },
            include: [
                {
                    model: Order,
                    as: 'order',
                    attributes: [
                        'id', 'user_id', 'total_price', 'status',
                        'payment_date', 'status_changed_at'
                    ],
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
                },
                {
                    model: Coupon,
                    as: 'coupon',
                    attributes: [
                        'id', 'name', 'code', 'discount_type',
                        'discount_value', 'max_discount'
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
                    ]
                }
            ],
            attributes: [
                'id', 'subtotal', 'discount', 'final_total',
                'status', 'createdAt'
            ]
        });

        // Kiểm tra đơn hàng tồn tại
        if (!orderShop) {
            throw ResponseModel.error(HttpErrors.NOT_FOUND, 'Đơn hàng cửa hàng không tồn tại', {
                order_id,
                order_shop_id
            });
        }

        // Định dạng dữ liệu trả về
        const formattedOrder = {
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
                ward: orderShop.order.address?.ward ? orderShop.order.address.ward : undefined
            } : undefined,
            subtotal: parseFloat(orderShop.subtotal),
            discount: parseFloat(orderShop.discount),
            final_total: parseFloat(orderShop.final_total),
            status: orderShop.status, // Sử dụng status của OrderShop
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
                product_variant: {
                    id: item.product_variant.id,
                    sku: item.product_variant.sku,
                    image_url: item.product_variant.image_url,
                    stock_quantity: item.product_variant.stock_quantity,
                    product: {
                        id: item.product_variant.product.id,
                        name: item.product_variant.product.product_name,
                        unit_price: parseFloat(item.product_variant.product.unit_price)
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
        };

        return ResponseModel.success('Chi tiết đơn hàng của cửa hàng', {
            orders: [formattedOrder]
        });
    } catch (error) {
        throw ResponseModel.error(
            error?.status ?? HttpErrors.INTERNAL_SERVER_ERROR,
            error?.message ?? 'Lỗi khi lấy chi tiết đơn hàng cửa hàng',
            error?.body ?? { order_id, order_shop_id }
        );
    }
};

// Tổng quan cửa hàng 
export const fetchShopOverview = async (shop_id, { dateRanges }) => {
    try {
        if (!shop_id || !dateRanges || !Array.isArray(dateRanges)) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                shop_id: shop_id ?? '',
                dateRanges: dateRanges ?? ''
            });
        }

        /** Tổng hợp dữ liệu cho từng khoảng thời gian **/
        const monthlyStats = await Promise.all(dateRanges.map(async (range) => {
            const { startDate, endDate, month } = range;

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
                            status: OrderStatus.COMPLETED
                        }
                    }
                ],
                attributes: [
                    [Sequelize.fn('SUM', Sequelize.col('final_total')), 'totalRevenue'],
                    [Sequelize.fn('COUNT', Sequelize.col('OrderShop.id')), 'totalOrders']
                ],
                raw: true
            })

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
                group: ['OrderShop.status'],
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

            /** Tổng hợp **/
            return {
                month: month || null,
                startDate,
                endDate,
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
            };
        }))

        /** 5. Định dạng dữ liệu trả về **/
        const overview = monthlyStats.reduce((acc, stat) => {
            acc.totalRevenue += stat.totalRevenue;
            acc.totalOrders += stat.totalOrders;
            acc.totalSoldProducts += stat.totalSoldProducts;
            acc.totalCustomers = Math.max(acc.totalCustomers, stat.totalCustomers);
            Object.keys(stat.orderStatusCounts).forEach(status => {
                acc.orderStatusCounts[status] += stat.orderStatusCounts[status];
            });
            return acc;
        }, {
            totalRevenue: 0,
            totalOrders: 0,
            totalSoldProducts: 0,
            totalCustomers: 0,
            orderStatusCounts: {
                [OrderStatus.PENDING]: 0,
                [OrderStatus.PAID]: 0,
                [OrderStatus.SHIPPED]: 0,
                [OrderStatus.COMPLETED]: 0,
                [OrderStatus.CANCELED]: 0
            }
        });

        return ResponseModel.success('Thống kê tổng quan cửa hàng', {
            monthlyStats,
            overview
        });

    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

/**
 * API lấy thống kê doanh thu theo thời gian
 * @param {number} shopId - ID của cửa hàng
 * @param {Object} params - Tham số
 * @param {Array<{startDate: Date, endDate: Date, month: string}>} params.dateRanges - Khoảng thời gian thống kê
 * @param {string} params.groupBy - Nhóm theo (day, week, month)
 * @returns {Promise<Object>} - Phản hồi chứa thống kê doanh thu
 */
export const fetchRevenueOverTime = async (shop_id, { dateRanges, groupBy = 'day' }) => {
    try {

        if (!shop_id || !dateRanges || !Array.isArray(dateRanges) || !['day', 'week', 'month'].includes(groupBy)) {
            return ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu hoặc sai thông tin', {
                shop_id: shop_id ?? '',
                dateRanges: dateRanges ?? '',
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

        const monthlyStats = await Promise.all(dateRanges.map(async (range) => {
            const { startDate, endDate, month } = range;

            // 1. Truy vấn doanh thu tổng
            const revenueData = await OrderShop.findAll({
                where: {
                    shop_id: shop_id,
                    createdAt: {
                        [Op.between]: [startDate, endDate]
                    },
                    status: OrderStatus.COMPLETED,
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



            // Chuyển đổi dữ liệu thành map để tra cứu nhanh
            const revenueMap = new Map(revenueData.map(item => [item.period, parseFloat(item.revenue || 0)]));

            // Tạo danh sách đầy đủ các khoảng thời gian
            const formattedData = [];

            if (groupBy === 'day') {
                const start = new Date(startDate);
                const end = new Date(endDate);
                for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                    const period = d.toISOString().split('T')[0]; // Định dạng YYYY-MM-DD

                    formattedData.push({
                        period: period,
                        revenue: revenueMap.get(period) || 0,
                    });
                }
            } else if (groupBy === 'month') {
                const year = new Date(startDate).getFullYear();
                const expectedPeriod = `${year}-${month.toString().padStart(2, '0')}`;

                formattedData.push({
                    period: expectedPeriod,
                    revenue: revenueMap.get(expectedPeriod) || 0,
                });
            }

            return {
                month: month || null,
                startDate,
                endDate,
                revenues: formattedData,
                totalRevenue: formattedData.reduce((sum, item) => sum + item.revenue, 0)
            };
        }))

        const overview = {
            revenues: monthlyStats.flatMap(stat => stat.revenues),
            totalRevenue: monthlyStats.reduce((sum, stat) => sum + stat.totalRevenue, 0),
        };

        return ResponseModel.success('Thống kê doanh thu theo thời gian', {
            monthlyStats,
            overview
        });
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

// Thông kê đơn hàng gồm số lượng đơn hàng theo trạng thái hoặc nhóm theo thời gian
export const fetchOrderStats = async (shop_id, { dateRanges, groupBy = 'day', status = null }) => {
    try {
        if (!shop_id || !dateRanges || !Array.isArray(dateRanges) || !['day', 'week', 'month'].includes(groupBy)) {
            return ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu hoặc sai thông tin', {
                shop_id: shop_id ?? '',
                dateRanges: dateRanges ?? '',
                groupBy: groupBy ?? ''
            });
        }

        const groupByExpression = {
            day: Sequelize.fn('DATE', Sequelize.col('OrderShop.createdAt')),
            week: Sequelize.fn('DATE_FORMAT', Sequelize.col('OrderShop.createdAt'), '%Y-%u'),
            month: Sequelize.fn('DATE_FORMAT', Sequelize.col('OrderShop.createdAt'), '%Y-%m')
        }[groupBy];

        const groupByAlias = {
            day: Sequelize.fn('DATE', Sequelize.col('OrderShop.createdAt')),
            week: Sequelize.fn('DATE_FORMAT', Sequelize.col('OrderShop.createdAt'), '%Y-%u'),
            month: Sequelize.fn('DATE_FORMAT', Sequelize.col('OrderShop.createdAt'), '%Y-%m')
        }[groupBy];

        const monthlyStats = await Promise.all(dateRanges.map(async (range) => {
            const { startDate, endDate, month } = range;
            const whereClause = {
                shop_id: shop_id,
                createdAt: { [Op.between]: [startDate, endDate] },
            };

            const orderData = await OrderShop.findAll({
                where: whereClause,
                attributes: [
                    [groupByExpression, 'period'],
                    ['status', 'status'],
                    [Sequelize.fn('COUNT', Sequelize.col('OrderShop.id')), 'count']
                ],
                group: [groupByExpression, 'OrderShop.status'],
                order: [[Sequelize.col('period'), 'ASC']],
                raw: true
            });

            // Chuyển đổi orderData thành map để tra cứu nhanh
            const orderMap = new Map(orderData.map(
                item =>
                    [`${item.period}:${item.status}`, parseInt(item.count || 0)]
            ));

            const formattedData = [];
            const statusList = [
                OrderStatus.PENDING,
                OrderStatus.PAID,
                OrderStatus.PROCESSING,
                OrderStatus.SHIPPED,
                OrderStatus.COMPLETED,
                OrderStatus.CANCELED
            ];

            if (groupBy === 'day') {
                const start = new Date(startDate);
                const end = new Date(endDate);
                for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                    const period = d.toISOString().split('T')[0]; // Định dạng YYYY-MM-DD
                    const counts = {};
                    statusList.forEach(s => {
                        const key = `${period}:${s}`;
                        counts[s] = orderMap.get(key) || 0;
                    });
                    formattedData.push({
                        period: period,
                        counts: counts
                    });
                }
            } else if (groupBy === 'month') {
                const start = new Date(startDate);
                const end = new Date(endDate);
                const startYear = start.getFullYear();
                const endYear = end.getFullYear();
                const startMonth = start.getMonth();
                const endMonth = end.getMonth() + (endYear - startYear) * 12;
                for (let m = startMonth; m <= endMonth; m++) {
                    const year = startYear + Math.floor(m / 12);
                    const month = (m % 12) + 1;
                    const period = `${year}-${month.toString().padStart(2, '0')}`;
                    const counts = {};
                    statusList.forEach(status => {
                        const key = `${period}-${status}`;
                        counts[status] = orderMap[key] || 0;
                    });
                    formattedData.push({
                        period: period,
                        counts: counts
                    });
                }
            }

            return {
                month: month || null,
                startDate,
                endDate,
                orders: formattedData,
                totalOrders: formattedData.reduce((sum, item) => sum + Object.values(item.counts).reduce((s, c) => s + c, 0), 0)
            };
        }))

        const overview = {
            orders: monthlyStats.flatMap(stat => stat.orders),
            totalOrders: monthlyStats.reduce((sum, stat) => sum + stat.totalOrders, 0)
        };

        const whereClause = {
            shop_id: shop_id,
            createdAt: { [Op.between]: [new Date(dateRanges[0].startDate), new Date(dateRanges[0].endDate)] },
        };

        const statusCounts = await OrderShop.findAll({
            where: whereClause,
            attributes: [
                ['status', 'status'],
                [Sequelize.fn('COUNT', Sequelize.col('OrderShop.id')), 'count']
            ],
            group: ['status'],
            raw: true
        });

        return ResponseModel.success('Thống kê đơn hàng', {
            monthlyStats,
            overview,
            statusCounts: statusCounts.reduce((acc, stat) => {
                acc[stat.status] = parseInt(stat.count || 0);
                return acc;
            }, { pending: 0, paid: 0, shipped: 0, completed: 0, canceled: 0, processing: 0 }),
            totalOrders: statusCounts.reduce((sum, stat) => sum + parseInt(stat.count || 0), 0)
        });
    } catch (error) {
        return ResponseModel.error(error?.status, error?.message, error?.body);
    }
};

// Thống kê sản phẩm bán chạy
export const fetchTopSellingProducts = async (shop_id, { dateRanges, limit = 10 }) => {
    try {
        if (!shop_id || !dateRanges || !Array.isArray(dateRanges) || dateRanges.length === 0) {
            return ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                shop_id: shop_id ?? '',
                dateRanges: dateRanges ?? '',
            });
        }

        // Kiểm tra xem mỗi range có startDate và endDate hợp lệ không
        const hasInvalidRange = dateRanges.some(range => !range.startDate || !range.endDate);
        if (hasInvalidRange) {
            return ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu startDate hoặc endDate trong một hoặc nhiều dateRanges', {
                dateRanges: dateRanges
            });
        }

        // Tổng hợp dữ liệu từ tất cả các khoảng thời gian trong dateRanges
        const topProducts = await OrderItem.findAll({
            where: {
                '$order_shop.shop_id$': shop_id,
                '$order_shop.createdAt$': {
                    [Op.between]: [
                        new Date(Math.min(...dateRanges.map(r => new Date(r.startDate)))),
                        new Date(Math.max(...dateRanges.map(r => new Date(r.endDate))))
                    ]
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
        });

        const formattedProducts = topProducts.map(product => ({
            id: product['product_variant.id'],
            product_variant_id: product['product_variant.id'],
            sku: product['product_variant.sku'],
            image_url: product['product_variant.image_url'],
            product: {
                id: product['product_variant.product.id'],
                product_name: product['product_variant.product.product_name'],
                unit_price: parseFloat(product['product_variant.product.unit_price'] || 0)
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
        return ResponseModel.error(error?.status, error?.message, error?.body);
    }
};

// Thống kê khách hàng gồm tổng số khách hàng và top khách hàng chi tiêu cao
export const fetchCustomerStats = async (shop_id, { dateRanges, limit = 5 }) => {
    try {
        if (!shop_id || !dateRanges || !Array.isArray(dateRanges) || dateRanges.length === 0) {
            return ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                shop_id: shop_id ?? '',
                dateRanges: dateRanges ?? ''
            });
        }

        // Kiểm tra xem mỗi range có startDate và endDate hợp lệ không
        const hasInvalidRange = dateRanges.some(range => !range.startDate || !range.endDate);
        if (hasInvalidRange) {
            return ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu startDate hoặc endDate trong một hoặc nhiều dateRanges', {
                dateRanges: dateRanges
            });
        }

        // Tính khoảng thời gian lớn nhất bao gồm tất cả dateRanges
        const overallStartDate = new Date(Math.min(...dateRanges.map(r => new Date(r.startDate))));
        const overallEndDate = new Date(Math.max(...dateRanges.map(r => new Date(r.endDate))));

        /** 1. Tổng số khách hàng **/
        const totalCustomers = await OrderShop.findAll({
            where: {
                shop_id: shop_id,
                createdAt: {
                    [Op.between]: [overallStartDate, overallEndDate]
                },
                '$order.status$': {
                    [Op.ne]: OrderStatus.CANCELED
                },
            },
            include: [
                {
                    model: Order,
                    as: 'order',
                    attributes: ['id', 'status', 'user_id']
                }
            ],
            attributes: [
                [Sequelize.fn('COUNT', Sequelize.fn('DISTINCT', Sequelize.col('order.user_id'))), 'totalCustomers']
            ],
            raw: true
        })

        /** 2. Top khách hàng chi tiêu cao **/
        const topCustomers = await OrderShop.findAll({
            where: {
                shop_id: shop_id,
                createdAt: {
                    [Op.between]: [overallStartDate, overallEndDate],
                },
                status: [
                    OrderStatus.PAID,
                    OrderStatus.COMPLETED
                ],
            },
            include: [
                {
                    model: Order,
                    as: 'order',
                    attributes: ['id', 'status', 'user_id'],
                    include: [
                        {
                            model: User,
                            as: 'user',
                            attributes: ['id', 'name', 'email', 'image_url'],
                            required: false
                        }
                    ]
                }
            ],
            attributes: [
                [Sequelize.col('order.user_id'), 'userId'],
                [Sequelize.col('order->user.name'), 'name'],
                [Sequelize.col('order->user.email'), 'email'],
                [Sequelize.col('order->user.image_url'), 'image_url'],
                [Sequelize.fn('SUM', Sequelize.col('final_total')), 'totalSpent']
            ],
            group: [
                'order.user_id',
                'order->user.name',
                'order->user.email',
                'order->user.image_url'
            ],
            order: [[Sequelize.literal('totalSpent'), 'DESC']],
            limit,
            raw: true
        })

        /** 3. Định dạng dữ liệu trả về **/
        const formattedCustomers = topCustomers.map(customer => ({
            userId: customer.userId,
            name: customer.name,
            email: customer.email,
            image_url: customer.image_url,
            totalSpent: parseFloat(customer.totalSpent || 0)
        }));

        return ResponseModel.success('Thống kê khách hàng', {
            totalCustomers: parseInt(totalCustomers[0]?.totalCustomers || 0),
            topCustomers: formattedCustomers
        });
    } catch (error) {
        return ResponseModel.error(error?.status, error?.message, error?.body);
    }
};

// Thống kê các biến thể sản phẩm tồn kho thấp
export const fetchLowStockProducts = async (shop_id, { minStock = 10 }) => {
    try {
        if (!shop_id) {
            return ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                shop_id: shop_id ?? '',
            });
        }

        /** 1. Tổng số khách hàng **/
        const lowStockProducts = await ProductVariant.findAll({
            where: {
                stock_quantity: {
                    [Op.lte]: minStock
                },
                '$product.shopId$': shop_id
            },
            include: [
                {
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'product_name'],
                    where: { shopId: shop_id }
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
            ],
            attributes: ['id', 'sku', 'image_url', 'stock_quantity'],
            order: [['stock_quantity', 'ASC']],
            raw: true
        })

        /** 2. Định dạng dữ liệu trả về **/
        const formattedProducts = lowStockProducts.map(product => ({
            id: product.id,
            product_variant_id: product.id,
            sku: product.sku,
            image_url: product.image_url,
            stock_quantity: parseInt(product.stock_quantity || 0),
            product: {
                id: product['product.id'],
                product_name: product['product.product_name']
            },
            color: product['color.color_name'] ? {
                id: product['color.id'],
                color_name: product['color.color_name'],
                color_code: product['color.color_code']
            } : undefined,
            size: product['size.size_code'] ? {
                id: product['size.id'],
                size_code: product['size.size_code']
            } : undefined
        }));

        return ResponseModel.success('Danh sách sản phẩm tồn kho thấp', {
            products: formattedProducts
        });
    } catch (error) {
        return ResponseModel.error(error?.status, error?.message, error?.body);
    }
};

// Thống kê tỷ lệ hoàn thành đơn hàng
export const fetchOrderCompletionStats = async (shop_id, { dateRanges, groupBy = 'day' }) => {
    try {
        if (!shop_id || !dateRanges || !Array.isArray(dateRanges) || dateRanges.length === 0 || !['day', 'month'].includes(groupBy)) {
            return ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu hoặc sai thông tin', {
                shop_id: shop_id ?? '',
                dateRanges: dateRanges ?? '',
                groupBy: groupBy ?? ''
            });
        }

        const hasInvalidRange = dateRanges.some(range => !range.startDate || !range.endDate);
        if (hasInvalidRange) {
            return ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu startDate hoặc endDate trong một hoặc nhiều dateRanges', {
                dateRanges: dateRanges
            });
        }

        const groupByExpression = {
            day: Sequelize.fn('DATE', Sequelize.col('OrderShop.createdAt')),
            week: Sequelize.fn('DATE_FORMAT', Sequelize.col('OrderShop.createdAt'), '%Y-%u'),
            month: Sequelize.fn('DATE_FORMAT', Sequelize.col('OrderShop.createdAt', '%Y-%m'))
        }[groupBy];

        const completionData = await OrderShop.findAll({
            where: {
                shop_id: shop_id,
                createdAt: {
                    [Op.between]: [
                        new Date(Math.min(...dateRanges.map(r => new Date(r.startDate)))),
                        new Date(Math.max(...dateRanges.map(r => new Date(r.endDate))))
                    ]
                },
                status: [OrderStatus.COMPLETED, OrderStatus.CANCELED]
            },
            include: [
                {
                    model: Order,
                    as: 'order',
                    attributes: ['id', 'status'],
                }
            ],
            attributes: [
                [groupByExpression, 'period'],
                ['status', 'status'],
                [Sequelize.fn('COUNT', Sequelize.col('OrderShop.id')), 'count']
            ],
            group: [groupByExpression, 'OrderShop.status'],
            order: [[Sequelize.col('period'), 'ASC']],
            raw: true
        })

        // Chuyển đổi completionData thành map để tra cứu nhanh
        const completionMap = new Map(
            completionData.map(
                item => [`${item.period}:${item.status}`, parseInt(item.count || 0)]
            )
        );

        // Tạo danh sách đầy đủ các khoảng thời gian
        const formattedData = [];
        const overallStartDate = new Date(Math.min(...dateRanges.map(r => new Date(r.startDate))));
        const overallEndDate = new Date(Math.max(...dateRanges.map(r => new Date(r.endDate))));

        if (groupBy === 'day') {
            for (let d = new Date(overallStartDate); d <= overallEndDate; d.setDate(d.getDate() + 1)) {
                const period = d.toISOString().split('T')[0]; // YYYY-MM-DD
                const completed = completionMap.get(`${period}:${OrderStatus.COMPLETED}`) || 0;
                const canceled = completionMap.get(`${period}:${OrderStatus.CANCELED}`) || 0;
                const total = completed + canceled;
                const completionRate = total > 0 ? parseFloat((completed / total).toFixed(4)) : 0;
                formattedData.push({
                    period,
                    completed,
                    canceled,
                    total,
                    completion_rate: completionRate
                });
            }
        } else if (groupBy === 'month') {
            const startYear = overallStartDate.getFullYear();
            const endYear = overallEndDate.getFullYear();
            const startMonth = overallStartDate.getMonth();
            const endMonth = overallEndDate.getMonth() + (endYear - startYear) * 12;
            for (let m = startMonth; m <= endMonth; m++) {
                const year = startYear + Math.floor(m / 12);
                const month = (m % 12) + 1;
                const period = `${year}-${month.toString().padStart(2, '0')}`;
                const completed = completionMap.get(`${period}:${OrderStatus.COMPLETED}`) || 0;
                const canceled = completionMap.get(`${period}:${OrderStatus.CANCELED}`) || 0;
                const total = completed + canceled;
                const completionRate = total > 0 ? parseFloat((completed / total).toFixed(4)) : 0;
                formattedData.push({
                    period,
                    completed,
                    canceled,
                    total,
                    completion_rate: completionRate
                });
            }
        }

        const summary = formattedData.reduce(
            (acc, item) => {
                acc.completed += item.completed;
                acc.canceled += item.canceled;
                acc.total += item.total;
                return acc;
            },
            { completed: 0, canceled: 0, total: 0 }
        );

        return ResponseModel.success('Thống kê tỷ lệ hoàn thành đơn hàng', {
            byPeriod: formattedData,
            summary
        });
    } catch (error) {
        return ResponseModel.error(error?.status, error?.message, error?.body);
    }
};