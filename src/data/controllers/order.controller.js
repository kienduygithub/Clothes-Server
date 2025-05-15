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

/** ADMIN - OWNER **/
export const fetchListOrderForAdmin = async (req, res) => {
    try {
        const response = await OrderService.fetchListOrderForAdmin();
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status || HttpErrors.INTERNAL_SERVER_ERROR).json({
            status: error?.status || HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message || 'UNKNOWN',
            body: error?.body ?? {}
        })
    }
}

export const fetchListShopOrder = async (req, res) => {
    try {
        const shop_id = req.user.shopId;
        const status = req.query.status;
        const response = await OrderService.fetchListShopOrder(shop_id, status);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status || HttpErrors.INTERNAL_SERVER_ERROR).json({
            status: error?.status || HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message || 'UNKNOWN',
            body: error?.body ?? {}
        })
    }
}

export const updateStatusOrder = async (req, res) => {
    try {
        const { order_shop_id, status } = req.body;
        const response = await OrderService.updateStatusOrder(order_shop_id, status);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status || HttpErrors.INTERNAL_SERVER_ERROR).json({
            status: error?.status || HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message || 'UNKNOWN',
            body: error?.body ?? {}
        })
    }
}

export const fetchOrderShopDetail = async (req, res) => {
    try {
        const { order_id, order_shop_id } = req.query;
        const response = await OrderService.fetchOrderShopDetail(order_id, order_shop_id);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status || HttpErrors.INTERNAL_SERVER_ERROR).json({
            status: error?.status || HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message || 'UNKNOWN',
            body: error?.body ?? {}
        })
    }
}

export const fetchShopOverview = async (req, res) => {
    try {
        const shop_id = req.user.shopId;
        const response = await OrderService.fetchShopOverview(
            shop_id,
            req.body
        );
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status || HttpErrors.INTERNAL_SERVER_ERROR).json({
            status: error?.status || HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message || 'UNKNOWN',
            body: error?.body ?? {}
        })
    }
}

// Thống kê doanh thu theo thời gian
export const fetchRevenueOverTime = async (req, res) => {
    try {
        const shop_id = req.user.shopId;
        const response = await OrderService.fetchRevenueOverTime(
            shop_id,
            req.body
        );
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status || HttpErrors.INTERNAL_SERVER_ERROR).json({
            status: error?.status || HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message || 'UNKNOWN',
            body: error?.body ?? {}
        })
    }
}

// Thông kê đơn hàng gồm số lượng đơn hàng theo trạng thái hoặc nhóm theo thời gian
export const fetchOrderStats = async (req, res) => {
    try {
        const shop_id = req.user.shopId;
        const response = await OrderService.fetchOrderStats(
            shop_id,
            req.body
        );
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status || HttpErrors.INTERNAL_SERVER_ERROR).json({
            status: error?.status || HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message || 'UNKNOWN',
            body: error?.body ?? {}
        })
    }
}

// Thống kê sản phẩm bán chạy
export const fetchTopSellingProducts = async (req, res) => {
    try {
        const shop_id = req.user.shopId;
        const response = await OrderService.fetchTopSellingProducts(
            shop_id,
            req.body
        );
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status || HttpErrors.INTERNAL_SERVER_ERROR).json({
            status: error?.status || HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message || 'UNKNOWN',
            body: error?.body ?? {}
        })
    }
}

// Thống kê khách hàng gồm tổng số khách hàng và top khách hàng chi tiêu cao
export const fetchCustomerStats = async (req, res) => {
    try {
        const shop_id = req.user.shopId;
        const response = await OrderService.fetchCustomerStats(
            shop_id,
            req.body
        );
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status || HttpErrors.INTERNAL_SERVER_ERROR).json({
            status: error?.status || HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message || 'UNKNOWN',
            body: error?.body ?? {}
        })
    }
}

// Thống kê các biến thể sản phẩm tồn kho thấp
export const fetchLowStockProducts = async (req, res) => {
    try {
        const shop_id = req.user.shopId;
        const response = await OrderService.fetchLowStockProducts(
            shop_id,
            req.body
        );
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status || HttpErrors.INTERNAL_SERVER_ERROR).json({
            status: error?.status || HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message || 'UNKNOWN',
            body: error?.body ?? {}
        })
    }
}

// Thống kê tỷ lệ hoàn thành đơn hàng
export const fetchOrderCompletionStats = async (req, res) => {
    try {
        const shop_id = req.user.shopId;
        const response = await OrderService.fetchOrderCompletionStats(
            shop_id,
            req.body
        );
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status || HttpErrors.INTERNAL_SERVER_ERROR).json({
            status: error?.status || HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message || 'UNKNOWN',
            body: error?.body ?? {}
        })
    }
}