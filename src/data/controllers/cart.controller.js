import HttpErrors from "../../common/errors/http-errors";
import * as CartService from "../services/cart.service";

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