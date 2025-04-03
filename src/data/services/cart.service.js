import HttpErrors from "../../common/errors/http-errors";
import { ResponseModel } from "../../common/errors/response"
import { Cart, CartShop, CartItem, Shop, Product, ProductVariant, sequelize } from "../models";

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
                                    include: {
                                        model: Product,
                                        as: 'product',
                                        attributes: ['id', 'product_name', 'unit_price']
                                    }
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
            });
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

export const updateCartItem = async (user_id, cart_id, item_id, quantity) => {
    try {

    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const removeCartItem = async (user_id, cart_id, item_id) => {
    try {

    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const removeCartShop = async (user_id, cart_id, cart_shop_id) => {
    try {

    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const paymentCart = async (user_id, cart_id) => {
    try {

    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}