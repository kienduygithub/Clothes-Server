import { WebSocketServer } from 'ws';
import db from '../../data/models';

export const UserClient = new Map();

export const ShopClient = new Map();

export const initWebSocket = (port = 3001) => {
    const wss = new WebSocketServer({ port });

    wss.on('error', (error) => {
        console.error('>>> Error websocket server:', error);
    });

    wss.on('connection', (ws) => {

        ws.on('close', () => {
            if (ws.userId) {
                UserClient.delete(ws.userId);
                console.log(`User ${ws.userId} disconnected`);
            }

            if (ws.shopId) {
                ShopClient.delete(ws.shopId);
                console.log(`User ${ws.shopId} disconnected`);
            }
        });

        ws.on('message', async (message) => {
            try {
                const data = JSON.parse(message);

                switch (data.type) {
                    case 'register':
                        handleRegister(ws, data);
                        break;
                    case 'logout':
                        handleLogout(ws, data);
                        break;
                    case 'read_message':
                        await handleReadMessage(ws, data);
                        break;
                }

            } catch (error) {
                console.log('>>> Error parse message websocket: ', error);
            }
        });

        // Thiết lập ping/pong để duy trì kết nối
        const pingInterval = setInterval(() => {
            if (ws.readyState === ws.OPEN) {
                ws.ping();
            } else {
                clearInterval(pingInterval);
            }
        }, 30000);
    });

    console.log(`>>> Connected to WebSocket: ws://localhost:${port}`);

    return wss;
}

export const pushNotificationUser = (user_id, message) => {
    const ws = UserClient.get(user_id);
    if (ws && ws.readyState === ws.OPEN) {
        try {
            const data = typeof message === 'string' ? message : JSON.stringify(message);
            ws.send(data);
            return true;
        } catch (error) {
            console.log(`>>> Error sending message to user ${user_id}: `, error);
            return false;
        }
    } else {
        console.log(`User is not connected`);
    }
}

export const broadcastNotification = (message, excludeUserId = null) => {
    let successCount = 0;
    UserClient.forEach((ws, user_id) => {
        if (excludeUserId !== user_id && ws.readyState === ws.OPEN) {
            try {
                const data = typeof message === 'string' ? message : JSON.stringify(message);
                ws.send(data);
                successCount++;
            } catch (error) {
                console.log(`>>> Error broadcasting to user ${user_id}: `, error);
            }
        }
    });

    ShopClient.forEach((ws, shop_id) => {
        if (excludeUserId !== shop_id && ws.readyState === ws.OPEN) {
            try {
                const data = typeof message === 'string' ? message : JSON.stringify(message);
                ws.send(data);
                successCount++;
            } catch (error) {
                console.log(`>>> Error broadcasting to shop ${shop_id}: `, error);
            }
        }
    });

    return successCount;
}

const handleRegister = (ws, data) => {
    if (data.userId) {
        ws.userId = data.userId;
        UserClient.set(data.userId, ws);
        console.log(`User ${data.userId} connected`);
        console.log('>>> Active clients: ', Array.from(UserClient.keys()));
    }

    if (data.shopId) {
        ws.shopId = data.shopId;
        ShopClient.set(data.shopId, ws);
        console.log(`Shop ${data.shopId} connected`);
        console.log('>>> Active shops: ', Array.from(ShopClient.keys()));
    }
}

const handleLogout = (ws, data) => {
    if (data.userId) {
        UserClient.delete(data.userId);
        console.log(`User ${data.userId} logged out`);
        console.log('>>> Active clients: ', Array.from(UserClient.keys()));
    }

    if (data.shopId) {
        ShopClient.delete(data.shopId);
        console.log(`Shop ${data.shopId} logged out`);
        console.log('>>> Active shops: ', Array.from(ShopClient.keys()));
    }
}

const handleReadMessage = async (ws, data) => {
    try {
        const { messageId, readerId } = data;

        // Cập nhật trạng thái đã đọc
        await db.Chat.update(
            { isRead: true },
            {
                where: {
                    id: messageId,
                    receiverId: readerId
                }
            }
        );

        // Thông báo cho người gửi biết tin nhắn đã được đọc
        const chat = await db.Chat.findByPk(messageId);
        if (chat) {
            const senderWs = UserClient.get(chat.senderId) || ShopClient.get(chat.senderId);
            if (senderWs && senderWs.readyState === senderWs.OPEN) {
                senderWs.send(JSON.stringify({
                    type: 'message_read',
                    data: { messageId }
                }));
            }
        }

    } catch (error) {
        console.error('>>> Error marking message as read:', error);
    }
}
