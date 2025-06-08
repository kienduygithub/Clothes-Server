import HttpErrors from "../../common/errors/http-errors"
import * as NotificationService from "../services/notification.service";

export const fetchListNotificationUser = async (req, res) => {
    try {
        const user_id = req.user.id;
        const { page = '1', limit = '10' } = req.query;
        const parseIntPage = parseInt(page);
        const parseIntLimit = parseInt(limit);
        const response = await NotificationService.fetchListNotificationUser(user_id, { page: parseIntPage, limit: parseIntLimit });
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status || HttpErrors.INTERNAL_SERVER_ERROR).json({
            status: error?.status || HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message || 'UNKNOWN',
            body: error?.body || {}
        })
    }
}

export const fetchUnreadNotificationCount = async (req, res) => {
    try {
        const user_id = req.user.id;
        const response = await NotificationService.fetchUnreadNotificationCount(user_id);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status || HttpErrors.INTERNAL_SERVER_ERROR).json({
            status: error?.status || HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message || 'UNKNOWN',
            body: error?.body || {}
        })
    }
}

export const markNotificationAsRead = async (req, res) => {
    try {
        const user_id = req.params.userId;
        const notification_id = req.params.notificationId
        const response = await NotificationService.markNotificationAsRead(user_id, notification_id);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status || HttpErrors.INTERNAL_SERVER_ERROR).json({
            status: error?.status || HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message || 'UNKNOWN',
            body: error?.body || {}
        })
    }
}

export const markAllNotificationAsRead = async (req, res) => {
    try {
        const user_id = req.params.userId;
        const response = await NotificationService.markAllNotificationAsRead(user_id);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status || HttpErrors.INTERNAL_SERVER_ERROR).json({
            status: error?.status || HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message || 'UNKNOWN',
            body: error?.body || {}
        })
    }
}

export const fetchOrderDetails = async (req, res) => {
    try {
        const user_id = req.params.userId;
        const order_id = req.params.orderId;
        const response = await NotificationService.fetchOrderDetails(user_id, order_id);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status || HttpErrors.INTERNAL_SERVER_ERROR).json({
            status: error?.status || HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message || 'UNKNOWN',
            body: error?.body || {}
        })
    }
}