import { Op } from "sequelize";
import HttpErrors from "../../common/errors/http-errors";
import { ResponseModel } from "../../common/errors/response"
import {
    Cart,
    CartShop,
    CartItem,
    Shop,
    Product,
    ProductVariant,
    Color,
    Size,
    sequelize
} from "../models";

export const getCartByUser = async (user_id, cart_id) => {
    try {
        if (!user_id || !cart_id) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                user_id: user_id ?? '',
                cart_id: cart_id ?? ''
            });
        }

        const cart = await Cart.findOne({
            where: { id: cart_id, user_id: user_id },
            include: [
                {
                    model: CartShop,
                    as: 'cart_shops',
                    attributes: ['id', 'shop_id'],
                    include: [
                        {
                            model: Shop,
                            as: 'shop',
                            attributes: ['id', 'shop_name']
                        },
                        {
                            model: CartItem,
                            as: 'cart_items',
                            attributes: ['id', 'product_variant_id', 'quantity'],
                            include: [
                                {
                                    model: ProductVariant,
                                    as: 'product_variant',
                                    attributes: ['id', 'productId', 'image_url', 'stock_quantity'],
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
                            ]
                        }
                    ]
                }
            ]
        });

        if (!cart) {
            return ResponseModel.success('Giỏ hàng: ', {
                carts: []
            });
        }

        const payload = {
            carts: [cart]
        };

        return ResponseModel.success('Giỏ hàng: ', payload);
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const addCartItem = async (user_id, cart_id, item_info) => {
    const t = await sequelize.transaction();
    try {
        if (!user_id || !cart_id || !item_info) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                user_id: user_id ?? '',
                cart_id: cart_id ?? '',
                item_info: item_info ?? {}
            });
        }

        if (quantity <= 0) {
            return ResponseModel.error(HttpErrors.BAD_REQUEST, 'Số lượng phải lớn hơn 0', { quantity });
        }

        let {
            shop_id,
            product_variant_id,
            quantity
        } = item_info;

        let cart = await Cart.findOne({
            where: { id: cart_id, user_id: user_id },
            transaction: t
        });

        if (!cart) {
            cart = await Cart.create({
                user_id: user_id
            }, { transaction: t });
            cart_id = cart.id; // Lấy ID giỏ hàng mới tạo
        }

        let cart_shop = await CartShop.findOne({
            where: { cart_id: cart_id, shop_id: shop_id },
            transaction: t
        });

        if (!cart_shop) {
            /** Chưa có thì tạo một CartShop mới */
            cart_shop = await CartShop.create({
                cart_id: cart_id,
                shop_id: shop_id
            }, { transaction: t });
        }

        const product_variant = await ProductVariant.findOne({
            where: { id: product_variant_id },
            transaction: t
        });

        if (!product_variant) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Sản phẩm không tồn tại', {});
        }

        if (quantity > product_variant.stock_quantity) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Không đủ số lượng hàng tồn kho', {
                stock_available: product_variant.stock_quantity
            });
        }

        const existingCartItem = await CartItem.findOne({
            where: {
                cart_shop_id: cart_shop.id,
                product_variant_id: product_variant_id
            },
            transaction: t
        });

        if (existingCartItem) {
            /** Nếu có thì cập nhật số lượng */
            const newQuantity = existingCartItem.quantity + quantity;
            if (newQuantity > product_variant.stock_quantity) {
                ResponseModel.error(HttpErrors.BAD_REQUEST, 'Vượt quá số lượng hàng tồn kho', {
                    stock_available: product_variant.stock_quantity
                });
            }

            await existingCartItem.update({
                quantity: newQuantity
            }, { transaction: t });
        } else {
            /** Nếu chưa có, thêm mới vào giỏ hàng */
            await CartItem.create({
                cart_shop_id: cart_shop.id,
                product_variant_id: product_variant_id,
                quantity: quantity
            }, { transaction: t });
        }

        await t.commit();

        return ResponseModel.success('Sản phẩm đã được thêm vào giỏ hàng: ', { cart_id: cart_id });
    } catch (error) {
        await t.rollback();
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const updateCartItem = async (user_id, cart_id, item_id, item_info) => {
    const t = await sequelize.transaction();
    try {
        if (!user_id || !cart_id || !item_id || !item_info) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                user_id: user_id ?? '',
                cart_id: cart_id ?? '',
                item_id: item_id ?? '',
                item_info: item_info ?? {}
            });
        }

        const cart_item = await CartItem.findOne({
            where: { id: item_id },
            transaction: t,
            include: {
                model: CartShop,
                as: 'cart_shop',
                include: {
                    model: Cart,
                    as: 'cart',
                    where: {
                        id: cart_id, user_id: user_id
                    }
                }
            }
        });

        if (!cart_item) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Sản phẩm của cửa hàng không tồn tại', {});
        }

        const {
            shop_id,
            product_variant_id,
            quantity
        } = item_info;

        if (quantity <= 0) {
            return ResponseModel.error(HttpErrors.BAD_REQUEST, 'Số lượng phải lớn hơn 0', {});
        }

        let cart_shop = await CartShop.findOne({
            where: { cart_id: cart_id, shop_id: shop_id },
            transaction: t
        });

        if (!cart_shop) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Giỏ hàng của cửa hàng không tồn tại', {});
        }

        const product_variant = await ProductVariant.findOne({
            where: { id: product_variant_id },
            transaction: t
        });

        if (!product_variant) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Biến thể sản phẩm không tồn tại', {});
        }

        if (quantity > product_variant.stock_quantity) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Không đủ hàng tồn kho', {
                stock_available: product_variant.stock_quantity
            });
        }

        const existing_cart_item = await CartItem.findOne({
            where: {
                product_variant_id: product_variant_id,
                cart_shop_id: cart_shop.id,
                id: {
                    [Op.ne]: item_id /** Khác Cart Item update */
                }
            }
        });

        if (existing_cart_item) {
            /** Cộng dồn số lượng và xóa cart item hiện tại */
            const total_quantity = existing_cart_item.quantity + quantity;
            if (total_quantity > product_variant.stock_quantity) {
                ResponseModel.error(HttpErrors.BAD_REQUEST, 'Không đủ hàng tồn kho để gộp sản phẩm', {
                    stock_available: product_variant.stock_quantity
                });
            }

            await existing_cart_item.update({
                quantity: total_quantity
            }, { transaction: t });

            await t.commit();
            return ResponseModel.success('Gộp sản phẩm đã tồn tại trong giỏ hàng của cửa hàng', {});
        } else {
            await cart_item.update({
                product_variant_id: product_variant_id,
                quantity: quantity
            }, { transaction: t });

            await t.commit();
            return ResponseModel.success('Cập nhật sản phẩm thành công', {});
        }
    } catch (error) {
        await t.rollback();
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const updateQuantityCartItem = async (user_id, cart_id, item_id, quantity) => {
    const t = await sequelize.transaction();
    try {
        if (!user_id || !cart_id || !item_id || !quantity) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                user_id: user_id ?? '',
                cart_id: cart_id ?? '',
                item_id: item_id ?? '',
                quantity: quantity ?? 0,
            })
        }

        const cart_item = await CartItem.findOne({
            where: { id: item_id },
            transaction: t,
            include: {
                model: CartShop,
                as: 'cart_shop',
                include: {
                    model: Cart,
                    as: 'cart',
                    where: {
                        id: cart_id, user_id: user_id
                    }
                }
            },
        });

        if (!cart_item) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Sản phẩm của cửa hàng không tồn tại', {});
        }

        const product_variant = await ProductVariant.findOne({
            where: { id: cart_item.product_variant_id },
            transaction: t
        })

        if (!product_variant) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Biến thể sản phẩm không tồn tại', {});
        }

        if (quantity > product_variant.stock_quantity) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Không đủ số lượng hàng tồn kho', {
                stock_available: product_variant.stock_quantity
            });
        }

        await cart_item.update({
            quantity: quantity
        }, { transaction: t });

        await t.commit();

        return ResponseModel.success('Cập nhật số lượng sản phẩm thành công', {});
    } catch (error) {
        await t.rollback();
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const removeCartItem = async (user_id, cart_id, item_id) => {
    const t = await sequelize.transaction();
    try {
        if (!user_id || !cart_id || !item_id) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                user_id: user_id ?? '',
                cart_id: cart_id ?? '',
                item_id: item_id ?? ''
            })
        }

        const cartItem = await CartItem.findOne({
            where: { id: item_id },
            transaction: t,
            include: {
                model: CartShop,
                as: 'cart_shop',
                include: {
                    model: Cart,
                    as: 'cart',
                    where: {
                        id: cart_id,
                        user_id: user_id
                    }
                }
            }
        })

        if (!cartItem) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Sản phẩm giỏ hàng không tồn tại', {});
        }

        await cartItem.destroy({ transaction: t });

        const cartShopId = cartItem.cart_shop.id;

        const remainingItems = await CartItem.count({
            where: { cart_shop_id: cartShopId },
            transaction: t
        });

        if (remainingItems === 0) {
            await CartShop.destroy({
                where: { id: cartShopId },
                transaction: t
            });
        }

        await t.commit();

        return ResponseModel.success('Xóa sản phẩm khỏi giỏ hàng thành công', {});
    } catch (error) {
        await t.rollback();
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const removeCartShop = async (user_id, cart_id, cart_shop_id) => {
    const t = await sequelize.transaction();
    try {
        if (!user_id || !cart_id || !cart_shop_id) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                user_id: user_id ?? '',
                cart_id: cart_id ?? '',
                cart_shop_id: cart_shop_id ?? ''
            })
        }

        const cart_shop = await CartShop.findOne({
            where: { id: cart_shop_id },
            transaction: t,
            include: {
                model: Cart,
                as: 'cart',
                where: {
                    id: cart_id, user_id: user_id
                }
            }
        });

        if (!cart_shop) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Giỏ hàng cho cửa hàng không tồn tại', {});
        }

        await cart_shop.destroy({ transaction: t });

        await t.commit();

        return ResponseModel.success('Xóa giỏ hàng của cửa hàng thành công', {});
    } catch (error) {
        await t.rollback();
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const paymentCart = async (user_id, cart_id) => {
    try {

    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}