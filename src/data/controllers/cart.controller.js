import HttpErrors from "../../common/errors/http-errors";
import * as CartService from "../services/cart.service";

export const getCartByUserNonAuthenticate = async (req, res) => {
    try {
        const user_id = req.params.userId;
        const cart_id = req.params.cartId;
        const response = await CartService.getCartByUser(user_id, cart_id);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status ?? HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body ?? {}
        });
    }
}

export const getCartByUser = async (req, res) => {
    try {
        const user_id = req.user.id;
        const cart_id = req.params.cartId;
        const response = await CartService.getCartByUser(user_id, cart_id);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status ?? HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body ?? {}
        });
    }
}

export const addCartItem = async (req, res) => {
    try {
        const user_id = req.user.id;
        const cart_id = req.params.cartId;
        const item_info = req.body;
        const response = await CartService.addCartItem(user_id, cart_id, item_info);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status ?? HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body ?? {}
        });
    }
}

export const updateCartItem = async (req, res) => {
    try {
        const user_id = req.user.id;
        const cart_id = req.params.cartId;
        const item_id = req.params.itemId;
        const item_info = req.body;
        const response = await CartService.updateCartItem(
            user_id,
            cart_id,
            item_id,
            item_info
        );
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status ?? HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body ?? {}
        });
    }
}

export const updateQuantityCartItem = async (req, res) => {
    try {
        const user_id = req.user.id;
        const cart_id = req.params.cartId;
        const item_id = req.params.itemId;
        const quantity = req.body.quantity;
        const response = await CartService.updateQuantityCartItem(
            user_id,
            cart_id,
            item_id,
            quantity
        )
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status ?? HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body ?? {}
        });
    }
}

export const removeCartItem = async (req, res) => {
    try {
        const user_id = req.user.id;
        const cart_id = req.params.cartId;
        const item_id = req.params.itemId;
        const response = await CartService.removeCartItem(
            user_id,
            cart_id,
            item_id,
        );
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status ?? HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body ?? {}
        });
    }
}

export const removeCartShop = async (req, res) => {
    try {
        const user_id = req.user.id;
        const cart_id = req.params.cartId;
        const cart_shop_id = req.params.cartShopId;
        const response = await CartService.removeCartShop(
            user_id,
            cart_id,
            cart_shop_id,
        );
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status ?? HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body ?? {}
        });
    }
}

export const applyCouponCartShop = async (req, res) => {
    try {
        const user_id = req.user.id;
        const cart_shop_id = req.params.cartShopId;
        const coupon_id = req.params.couponId;
        const response = await CartService.applyCouponCartShop(
            user_id,
            cart_shop_id,
            coupon_id,
        );
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status ?? HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body ?? {}
        });
    }
}

export const removeCouponFromCartShop = async (req, res) => {
    try {
        const user_id = req.user.id;
        const cart_shop_id = req.params.cartShopId;
        const response = await CartService.removeCouponFromCartShop(
            user_id,
            cart_shop_id,
        );
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status ?? HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body ?? {}
        });
    }
}

export const paymentCart = async (req, res) => {
    try {


    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status ?? HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body ?? {}
        });
    }
}