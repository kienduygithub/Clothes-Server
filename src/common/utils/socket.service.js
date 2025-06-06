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
    CONVERSATION_READ: 'conversation_read',
    CHECK_USER_STATUS: 'check_user_status',
    USER_STATUS: 'user_status',
    UPDATE_CONVERSATIONS: 'update_conversations'
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
                broadcastUserStatus(ws.userId, false);
            }

            if (ws.shopId && ws.ownerId) {
                ShopClient.delete(ws.shopId);
                UserClient.delete(ws.ownerId);
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
                    case WebSocketNotificationType.CHECK_USER_STATUS:
                        handleCheckUserStatus(ws, data);
                        break;
                    case WebSocketNotificationType.NEW_MESSAGE: // Xử lý khi gửi tin nhắn
                        await handleNewMessage(ws, data);
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

export const broadcastUserStatus = async (userId, isOnline) => {
    /** 1. Tìm tất cả các cuộc trò chuyện liên quan đến userId **/
    const conversations = await db.Chat.findAll({
        where: {
            [Op.or]: [
                { senderId: userId },
                { receiverId: userId }
            ]
        }
    });

    /** 2. Tổng hợp tất cả userId liên quan (trừ chính userId) **/
    const relatedUserIds = new Set();
    conversations.forEach(chat => {
        if (chat.senderId !== chat.receiverId) {
            if (chat.senderId !== userId) {
                relatedUserIds.add(chat.senderId);
            }
            if (chat.receiverId !== userId) {
                relatedUserIds.add(chat.receiverId);
            }
        }
    })

    /** 3. Gửi thông báo trạng thái đến các user liên quan **/
    relatedUserIds.forEach(relatedUserId => {
        const ws = UserClient.get(relatedUserId);
        if (ws && ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({
                type: WebSocketNotificationType.USER_STATUS,
                userId: userId,
                isOnline: isOnline
            }))
        }
    })
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
        ws.userId = data.userId; // Dùng để khi onclose (vì vấn đề gì đó)
        UserClient.set(data.userId, ws);
        console.log(`User ${data.userId} connected`);
        console.log('>>> Active clients: ', Array.from(UserClient.keys()));
        broadcastUserStatus(data.userId, true);
    }

    if (data.shopId && data.ownerId) {
        ws.shopId = data?.shopId;
        ws.ownerId = data?.ownerId;
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
        broadcastUserStatus(data.userId, false);
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

const handleCheckUserStatus = (ws, data) => {
    const userId = data.userId;
    const isOnline = UserClient.has(userId) && UserClient.get(userId).readyState === UserClient.get(userId).OPEN;
    ws.send(JSON.stringify({
        type: WebSocketNotificationType.USER_STATUS,
        userId: userId,
        isOnline: isOnline
    }));
}

const handleNewMessage = async (ws, data) => {
    try {
        const newMessage = data.data;
        const senderId = newMessage.senderId;
        const receiverId = newMessage.receiverId;

        // Đếm số lượng tin nhắn chưa đọc trong cuộc hội thoại của người phải đọc
        const unreadMessages = await db.Chat.count({
            where: {
                senderId,
                receiverId,
                isRead: false
            }
        });

        // Lấy tin nhắn mới nhất để cập nhật lastMessage
        const conversation = await db.Chat.findOne({
            where: {
                [Op.or]: [
                    { senderId, receiverId },
                    { senderId: receiverId, receiverId: senderId }
                ]
            },
            order: [['createdAt', 'DESC']]
        });

        if (conversation) {
            console.log('>>> UserId (Người dùng)', ws.userId);
            console.log('>>> OwnerId (Chủ cửa hàng)', ws.ownerId);
            const updatedConversation = {
                otherUserId: senderId === (ws.userId || ws.ownerId) ? receiverId : senderId,
                lastMessage: newMessage,
                unreadCount: unreadMessages // Số tin nhắn chưa đọc thực tế
            };

            // Gửi thông báo cập nhật conversations cho cả sender và receiver
            [senderId, receiverId].forEach(userId => {
                const userWs = UserClient.get(userId);
                if (userWs && userWs.readyState === userWs.OPEN) {
                    console.log(userId);
                    userWs.send(JSON.stringify({
                        type: WebSocketNotificationType.UPDATE_CONVERSATIONS,
                        data: updatedConversation
                    }));
                }
            });
        }
    } catch (error) {
        console.error('>>> Error handling new message:', error);
    }
};
