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
    sequelize
} from "../models";
import { OrderStatus } from "../../common/utils/status";

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
            address_id, /** Cần thêm */
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
        const order = await Order.create({
            user_id: user_id,
            address_id: address_id ? address_id : null, /** Tạm thời thế */
            total_price: final_total,
            status: OrderStatus.PAID,
            status_changed_at: new Date()
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
            let finalCouponId = selected_coupon.id;
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
            order: {
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
            },
            subtotal,
            discount,
            final_total,
        });
    } catch (error) {
        await t.rollback();
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}