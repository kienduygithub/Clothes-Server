import HttpErrors from "../../common/errors/http-errors"
import * as NotificationService from "../services/notification.service";

export const fetchListNotificationUser = async (req, res) => {
    try {
        const user_id = req.params.userId;
        const response = await NotificationService.fetchListNotificationUser(user_id);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status || HttpErrors.INTERNAL_SERVER_ERROR).json({
            status: error?.status || HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message || 'UNKNOWN',
            body: error?.body || {}
        })
    }
}