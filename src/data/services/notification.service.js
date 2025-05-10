import HttpErrors from "../../common/errors/http-errors"
import { ResponseModel } from "../../common/errors/response"
import { Notification } from "../models";

export const fetchListNotificationUser = async (user_id, { page = 1, limit = 10 } = {}) => {
    try {
        if (!user_id || isNaN(user_id)) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, "User ID không hợp lệ", {
                user_id: user_id ?? ''
            });
        }

        const pageNum = Math.max(1, parseInt(page, 10));
        const limitNum = Math.max(1, parseInt(limit, 10));
        const offset = (pageNum - 1) * limitNum;

        const { count, rows } = await Notification.findAndCountAll({
            where: {
                user_id: user_id
            },
            attributes: [
                "id",
                "user_id",
                "roles",
                "type",
                "reference_id",
                "reference_type",
                "data",
                "action",
                "is_read",
                "createdAt"
            ],
            order: [["createdAt", "DESC"]],
            limit: limitNum,
            offset
        });

        const totalPages = Math.ceil(count / limit);
        const responseData = {
            notifications: rows.map(notification => ({
                id: notification.id,
                user_id: notification.user_id,
                roles: notification.roles,
                type: notification.type,
                reference_id: notification.reference_id,
                reference_type: notification.reference_type,
                data: notification.data !== null ? JSON.parse(notification.data) : {},
                action: notification.action,
                is_read: notification.is_read,
                created_at: notification.createdAt
            })),
            pagination: {
                currentPage: page,
                limit: limit,
                totalItems: count,
                totalPages: totalPages,
            }
        };

        return ResponseModel.success("Danh sách thông báo", responseData);
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}