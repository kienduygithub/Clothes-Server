import { WebSocketServer } from 'ws';
import db from '../../data/models';
import { Op } from 'sequelize';

export const WebSocketNotificationType = Object.freeze({
    REGISTER: 'register',
    LOGOUT: 'logout',
    NEW_MESSAGE: 'new_message',
    MESSAGE_READ: 'message_read',
    CHECK_SHOP_STATUS: 'check_shop_status',
    SHOP_STATUS: 'shop_status',
    CONVERSATION_READ: 'conversation_read'
})

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
                console.log(`Shop ${ws.shopId} disconnected`);
                broadcastShopStatus(ws.shopId, false);
            }
        });

        ws.on('message', async (message) => {
            try {
                const data = JSON.parse(message);

                switch (data.type) {
                    case WebSocketNotificationType.REGISTER:
                        handleRegister(ws, data);
                        break;
                    case WebSocketNotificationType.LOGOUT:
                        handleLogout(ws, data);
                        break;
                    case WebSocketNotificationType.MESSAGE_READ:
                        await handleReadMessage(ws, data);
                        break;
                    case WebSocketNotificationType.CHECK_SHOP_STATUS:
                        handleCheckShopStatus(ws, data);
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

export const broadcastShopStatus = async (shopId, isOnline) => {
    try {
        /** 1. Tìm tất cả user có cuộc trò chuyện với cửa hàng **/
        const shopUser = await db.User.findOne({
            where: { shopId },
            attributes: ['id']
        });

        if (!shopUser) {
            console.log(`>>> No user found for shopId: ${shopId}`);
            return;
        }

        const conversations = await db.Chat.findAll({
            where: {
                [Op.or]: [
                    { senderId: shopUser.id },
                    { receiverId: shopUser.id }
                ]
            }
        });

        /** 2. Tổng hợp tất cả senderId + receiverId **/
        const userIds = new Set();
        conversations.forEach(chat => {
            if (chat.senderId !== chat.receiverId) {
                // Chỉ thêm userId của người chứ không phải chủ shop
                if (chat.senderId !== shopUser.id) {
                    userIds.add(chat.senderId);
                }
                if (chat.receiverId !== shopUser.id) {
                    userIds.add(chat.receiverId);
                }
            }
        })

        userIds.forEach(userId => {
            const ws = UserClient.get(userId);
            if (ws && ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify({
                    type: WebSocketNotificationType.SHOP_STATUS,
                    shopId: shopId,
                    isOnline: isOnline
                }));
            }
        })

    } catch (error) {
        console.log('>>> Error broadcasting shop status: ', error);
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
        UserClient.set(data.userId, ws);
        console.log(`User ${data.userId} connected`);
        console.log('>>> Active clients: ', Array.from(UserClient.keys()));
    }

    if (data.shopId && data.ownerId) {
        ShopClient.set(data.shopId, ws);
        UserClient.set(data.ownerId, ws);
        console.log(`Shop ${data.shopId} connected`);
        console.log('>>> Active shops: ', Array.from(ShopClient.keys()));
        broadcastShopStatus(data.shopId, true); // Thông báo shop online
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
        UserClient.delete(data.ownerId);
        console.log(`Shop ${data.shopId} logged out`);
        console.log('>>> Active shops: ', Array.from(ShopClient.keys()));
        broadcastShopStatus(data.shopId, false); // Thông báo shop offline
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
                    type: WebSocketNotificationType.MESSAGE_READ,
                    data: { messageId }
                }));
            }
        }

    } catch (error) {
        console.error('>>> Error marking message as read:', error);
    }
}

const handleCheckShopStatus = (ws, data) => {
    const shopId = data.shopId;
    const isOnline = ShopClient.has(shopId) && ShopClient.get(shopId).readyState === ShopClient.get(shopId).OPEN;
    ws.send(JSON.stringify({
        type: WebSocketNotificationType.SHOP_STATUS,
        isOnline: isOnline,
        shopId: shopId
    }));
}
