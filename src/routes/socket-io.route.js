import express from "express";
import { broadcastNotification, pushNotificationUser } from "../common/utils/socket.service";
const SocketIORouter = express.Router();

SocketIORouter.get('/push-notification', (req, res) => {
    const notification = {
        message: `Thử nghiệm websocket`,
        type: 'WITHDRAW'
    };
    broadcastNotification(notification);
    res.status(201).json({ success: true });
})

export default SocketIORouter;