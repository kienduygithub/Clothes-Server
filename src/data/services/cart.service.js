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
    try {

    } catch (error) {
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