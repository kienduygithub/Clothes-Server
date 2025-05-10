import express from "express";
import * as NotificationController from "../data/controllers/notification.controller";
import { checkUserAuthenticationMobile } from "../common/middleware/jwt.middleware";

const NotificationRouter = express.Router();

NotificationRouter.get(
    '/notification',
    checkUserAuthenticationMobile,
    NotificationController.fetchListNotificationUser
)

export default NotificationRouter;