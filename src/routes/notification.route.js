import express from "express";
import * as NotificationController from "../data/controllers/notification.controller";
import { checkUserAuthenticationMobile } from "../common/middleware/jwt.middleware";

const NotificationRouter = express.Router();

NotificationRouter.get(
    '/notification',
    checkUserAuthenticationMobile,
    NotificationController.fetchListNotificationUser
)

NotificationRouter.get(
    '/notification/unread-count',
    checkUserAuthenticationMobile,
    NotificationController.fetchUnreadNotificationCount
)

NotificationRouter.patch(
    '/notification/user/:userId/:notificationId/read',
    NotificationController.markNotificationAsRead
)

NotificationRouter.patch(
    '/notification/user/:userId/read',
    NotificationController.markAllNotificationAsRead
)

NotificationRouter.get(
    '/order/user/:userId/:orderId/read',
    NotificationController.fetchOrderDetails
)

export default NotificationRouter;