import HttpErrors from "../../common/errors/http-errors"
import { ResponseModel } from "../../common/errors/response"
import db, { Notification, sequelize } from "../models";

export const fetchListNotificationUser = async (user_id, { page = 1, limit = 10 } = {}) => {
    try {
        if (!user_id || isNaN(user_id)) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, "User ID không hợp lệ", {
                user_id: user_id ?? ''
            });
        }

        const pageNum = Math.max(1, parseInt(page, 10));
        const limitNum = Math.max(1, parseInt(limit, 10));
        const offset = (pageNum - 1) * limitNum;

        const { count, rows } = await Notification.findAndCountAll({
            where: {
                user_id: user_id
            },
            attributes: [
                "id",
                "user_id",
                "roles",
                "type",
                "reference_id",
                "reference_type",
                "data",
                "action",
                "is_read",
                "createdAt"
            ],
            order: [["createdAt", "DESC"]],
            limit: limitNum,
            offset
        });

        const unreadCount = await Notification.count({
            where: { user_id, is_read: false },
        });

        const totalPages = Math.ceil(count / limit);
        const responseData = {
            notifications: rows.map(notification => ({
                id: notification.id,
                user_id: notification.user_id,
                roles: notification.roles,
                type: notification.type,
                reference_id: notification.reference_id !== null ? notification.reference_id : 0,
                reference_type: notification.reference_type,
                data: notification.data !== null ? JSON.parse(notification.data) : {},
                action: notification.action,
                is_read: notification.is_read,
                created_at: notification.createdAt
            })),
            pagination: {
                currentPage: page,
                limit: limit,
                totalItems: count,
                totalPages: totalPages,
            },
            unreadCount: unreadCount
        };

        return ResponseModel.success("Danh sách thông báo", responseData);
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const fetchUnreadNotificationCount = async (user_id) => {
    try {
        if (!user_id || isNaN(user_id)) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, "User ID không hợp lệ", {
                user_id: user_id ?? ''
            });
        }
        const unreadCount = await Notification.count({
            where: { user_id, is_read: false },
        });

        const responseData = {
            unreadCount: unreadCount
        };

        return ResponseModel.success("Unread notification count", responseData);
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const markNotificationAsRead = async (user_id, notification_id) => {
    const transaction = await sequelize.transaction();
    try {
        if (!user_id || !notification_id || isNaN(user_id) || !notification_id) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, "Thiếu thông tin cần thiết", {
                user_id: user_id ?? '',
                notification_id: notification_id ?? ''
            });
        }

        const isExistingNotification = await Notification.findOne({
            where: {
                id: notification_id,
                user_id: user_id
            },
            transaction
        })

        if (!isExistingNotification) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Đọc thông báo thất bại', {});
        }

        if (isExistingNotification.is_read === false) {
            await isExistingNotification.update({
                is_read: true
            }, { transaction });
        }

        const unreadCount = await Notification.count({
            where: {
                user_id: user_id,
                is_read: false
            },
            transaction
        });

        await transaction.commit();

        return ResponseModel.success("Đọc thông báo thành công", {
            unreadCount
        });
    } catch (error) {
        await transaction.rollback();
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const markAllNotificationAsRead = async (user_id) => {
    const transaction = await sequelize.transaction();
    try {
        if (!user_id) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, "Thiếu thông tin cần thiết", {
                user_id: user_id ?? '',
            });
        }

        const unreadNotifications = await Notification.findAll({
            where: {
                user_id: user_id,
                is_read: false
            },
            transaction
        });

        if (!unreadNotifications.length) {
            await transaction.commit();
            return ResponseModel.success("Không có thông báo chưa đọc", {});
        }

        await Notification.update(
            { is_read: true },
            {
                where: {
                    user_id: user_id,
                    is_read: false
                },
                transaction
            }
        )

        await transaction.commit();

        return ResponseModel.success("Đã đánh dấu tất cả thông báo là đã đọc", {});
    } catch (error) {
        await transaction.rollback();
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const fetchOrderDetails = async (user_id, order_id) => {
    try {
        if (!user_id || !order_id || isNaN(user_id) || !order_id) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, "Thiếu thông tin cần thiết", {
                user_id: user_id ?? '',
                order_id: order_id ?? ''
            });
        }

        const order = await db.Order.findOne({
            where: {
                id: order_id,
                // user_id: user_id,
            },
            include: [
                {
                    model: db.Address,
                    as: 'address',
                    attributes: [
                        'id', 'address_detail', 'name', 'phone',
                        'city_id', 'district_id', 'ward_id'
                    ],
                    required: false,
                    include: [
                        {
                            model: db.City,
                            as: 'city',
                            attributes: ['id', 'name'],
                        },
                        {
                            model: db.District,
                            as: 'district',
                            attributes: ['id', 'name'],
                        },
                        {
                            model: db.Ward,
                            as: 'ward',
                            attributes: ['id', 'name']
                        }
                    ]
                },
                {
                    model: db.OrderShop,
                    as: 'order_shops',
                    attributes: [
                        'id', 'order_id', 'shop_id', 'coupon_id',
                        'subtotal', 'discount', 'final_total'
                    ],
                    include: [
                        {
                            model: db.Shop,
                            as: 'shop',
                            attributes: ['id', 'shop_name', 'logo_url']
                        },
                        {
                            model: db.Coupon,
                            as: 'coupon',
                            attributes: [
                                'id', 'name', 'discount_type', 'discount_value',
                                'max_discount', 'min_order_value'
                            ],
                            required: false
                        },
                        {
                            model: db.OrderItem,
                            as: 'order_shop_items',
                            attributes: [
                                'id', 'order_shop_id', 'product_variant_id', 'quantity'
                            ],
                            include: [
                                {
                                    model: db.ProductVariant,
                                    as: 'product_variant',
                                    attributes: [
                                        'id', 'productId', 'colorId', 'sizeId',
                                        'image_url'
                                    ],
                                    include: [
                                        {
                                            model: db.Product,
                                            as: 'product',
                                            attributes: ['id', 'product_name', 'unit_price'],
                                        },
                                        {
                                            model: db.Color,
                                            as: 'color',
                                            attributes: ['id', 'color_name']
                                        },
                                        {
                                            model: db.Size,
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
        });

        const formattedOrders = {
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
            } : undefined,
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
        };

        return ResponseModel.success("Chi tiết đơn hàng", {
            orders: [formattedOrders]
        });
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}