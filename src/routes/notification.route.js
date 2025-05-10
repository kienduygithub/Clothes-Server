import express from "express";
import * as NotificationController from "../data/controllers/notification.controller";

const NotificationRouter = express.Router();

NotificationRouter.get(
    '/notification/user/:userId',
    NotificationController.fetchListNotificationUser
)

export default NotificationRouter;