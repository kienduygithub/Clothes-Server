import HttpErrors from "../../common/errors/http-errors";
import * as OrderService from "../services/order.service";

export const createOrderMobile = async (req, res) => {
    try {
        const user_id = req.user.id;
        const cartInfo = req.body;

        // Kiểm tra cartInfo
        if (!cartInfo || typeof cartInfo !== 'object' || !cartInfo.cart_shops) {
            return res.status(HttpErrors.BAD_REQUEST).json({
                status: HttpErrors.BAD_REQUEST,
                message: 'Thiếu thông tin giỏ hàng',
                body: {}
            });
        }

        const response = await OrderService.createOrderMobile(user_id, cartInfo);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status || HttpErrors.INTERNAL_SERVER_ERROR).json({
            status: error?.status || HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message || 'UNKNOWN',
            body: error?.body ?? {}
        })
    }
}

export const fetchListOrderUser = async (req, res) => {
    try {
        const user_id = req.params.userId;
        const response = await OrderService.fetchListOrderUser(user_id);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status || HttpErrors.INTERNAL_SERVER_ERROR).json({
            status: error?.status || HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message || 'UNKNOWN',
            body: error?.body ?? {}
        })
    }
}

export const cancelOrderUser = async (req, res) => {
    try {
        const user_id = req.user.id;
        const order_id = req.params.orderId;
        const response = await OrderService.cancelOrderUser(user_id, order_id);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status || HttpErrors.INTERNAL_SERVER_ERROR).json({
            status: error?.status || HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message || 'UNKNOWN',
            body: error?.body ?? {}
        })
    }
}