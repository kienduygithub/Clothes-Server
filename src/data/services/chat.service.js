import { Op } from "sequelize";
import db, { Chat, Sequelize, sequelize, User } from "../models";
import { ResponseModel } from "../../common/errors/response";
import {
    pushNotificationUser,
    ShopClient,
    UserClient,
    WebSocketNotificationType
} from "../../common/utils/socket.service";
import HttpErrors from "../../common/errors/http-errors";
import { handleDeleteImages } from "../../common/middleware/upload.middleware";

export const fetchChatHistory = async (userId1, userId2, page = 1, limit = 20) => {
    const transaction = await sequelize.transaction();
    try {
        const messages = await Chat.findAndCountAll({
            where: {
                [Op.or]: [
                    { senderId: userId1, receiverId: userId2 },
                    { senderId: userId2, receiverId: userId1 }
                ]
            },
            include: [
                {
                    model: User,
                    as: 'sender',
                    attributes: ['id', 'name', 'image_url', 'shopId'],
                    include: [
                        {
                            model: db.Shop,
                            as: 'shop',
                            attributes: ['id', 'shop_name', 'logo_url'],
                            required: false
                        }
                    ]
                },
                {
                    model: User,
                    as: 'receiver',
                    attributes: ['id', 'name', 'image_url', 'shopId'],
                    include: [
                        {
                            model: db.Shop,
                            as: 'shop',
                            attributes: ['id', 'shop_name', 'logo_url'],
                            required: false
                        }
                    ]
                }
            ],
            order: [['createdAt', 'ASC']],
            transaction: transaction
        });

        // Đánh dấu các tin nhắn từ userId2 gửi đến userId1 là đã đọc
        await Chat.update(
            { isRead: true },
            {
                where: {
                    senderId: userId2,
                    receiverId: userId1,
                    isRead: false
                },
                transaction
            }
        );

        // Đặt lại unreadCount của userId1 (người đang xem hội thoại)
        await db.Conversation.update(
            { unreadCount: 0 },
            {
                where: {
                    userId: userId1,
                    otherUserId: userId2
                },
                transaction
            }
        );

        await transaction.commit();

        return ResponseModel.success('Lịch sử hội thoại', {
            messages: messages.rows,
        })
    } catch (error) {
        await transaction.rollback();
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

/** Output: Danh sách các cuộc trò chuyện của một user **/
export const fetchConversations = async (userId) => {
    try {
        /** 1. Lấy tin nhắn mới nhất của mỗi cuộc trò chuyện bằng subquery **/
        const conversations = await db.Conversation.findAll({
            where: {
                userId: userId
            },
            include: [
                {
                    model: db.User,
                    as: 'otherUser',
                    foreignKey: 'otherUserId',
                    attributes: ['id', 'name', 'image_url', 'shopId'],
                    include: [
                        {
                            model: db.Shop,
                            as: 'shop',
                            attributes: ['id', 'shop_name', 'logo_url'],
                            required: false
                        }
                    ]
                },
                {
                    model: db.Chat,
                    as: 'lastMessage',
                    include: [
                        {
                            model: db.User,
                            as: 'sender',
                            attributes: ['id', 'name', 'image_url', 'shopId'],
                            include: [
                                {
                                    model: db.Shop,
                                    as: 'shop',
                                    attributes: ['id', 'shop_name', 'logo_url'],
                                    required: false
                                }
                            ]
                        },
                        {
                            model: db.User,
                            as: 'receiver',
                            attributes: ['id', 'name', 'image_url', 'shopId'],
                            include: [
                                {
                                    model: db.Shop,
                                    as: 'shop',
                                    attributes: ['id', 'shop_name', 'logo_url'],
                                    required: false
                                }
                            ]
                        }
                    ]
                }
            ],
            order: [['createdAt', 'DESC']],
        });

        /** 2. Tính unreadCount và định dạng dữ liệu **/
        const conversationList = conversations.map(conversation => ({
            otherUser: conversation.otherUser,
            lastMessage: conversation.lastMessage,
            unreadCount: conversation.unreadCount
        }));

        return ResponseModel.success('Danh sách trò chuyện', {
            conversations: conversationList
        });
    } catch (error) {
        console.error(error);
        return ResponseModel.error(error?.status || 500, error?.message || 'Lỗi hệ thống', error?.body);
    }
};

export const markMessageAsRead = async (messageId, readerId) => {
    const transaction = await sequelize.transaction();
    try {
        const message = await Chat.findOne({
            where: { id: messageId, receiverId: readerId },
            transaction
        });
        if (!message) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Tin nhắn không tồn tại hoặc không thuộc về người đọc', {});
        }

        // Đánh dấu tin nhắn là đã đọc
        await Chat.update(
            { isRead: true },
            {
                where: {
                    id: messageId,
                    receiverId: readerId
                },
                transaction
            }
        );

        // Cập nhật unreadCount trong Conversation
        await db.Conversation.update(
            { unreadCount: Sequelize.literal('unreadCount - 1') },
            {
                where: {
                    userId: readerId,
                    otherUserId: message.senderId
                },
                transaction
            }
        );

        pushNotificationUser(message.senderId, {
            type: WebSocketNotificationType.MESSAGE_READ,
            data: { messageId, readerId }
        });

        await transaction.commit();

        return ResponseModel.success('Đánh dấu tin nhắn đã đọc', {});
    } catch (error) {
        await transaction.rollback();
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const markConversationAsRead = async (userId1, userId2) => {
    const transaction = await sequelize.transaction();
    try {
        // Đánh dấu tất cả tin nhắn từ userId2 gửi đến userId1 là đã đọc
        const updatedCount = await Chat.update(
            { isRead: true },
            {
                where: {
                    receiverId: userId1,
                    senderId: userId2,
                    isRead: false
                },
                transaction
            }
        );

        if (updatedCount[0] === 0) {
            // Không có tin nhắn nào được cập nhật
            await transaction.commit();
            return ResponseModel.success('Đã đọc tất cả tin nhắn', {});
        }

        // Cập nhật unreadCount trong Conversation
        await db.Conversation.update(
            { unreadCount: 0 },
            {
                where: {
                    userId: userId1,
                    otherUserId: userId2
                },
                transaction
            }
        );

        pushNotificationUser(userId2, {
            type: WebSocketNotificationType.CONVERSATION_READ,
            data: { userId1, userId2 }
        });

        await transaction.commit();

        return ResponseModel.success('Đánh dấu trò chuyện đã đọc', {});
    } catch (error) {
        await transaction.rollback();
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const createMessage = async (
    senderId,
    receiverId,
    message,
    files = [],
    isRead = false
) => {
    const transaction = await sequelize.transaction();
    let attachments = null;
    let messageType = 'text';

    try {
        const receiver = await User.findByPk(receiverId);
        if (!receiver) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Receiver not found', {});
        }

        if (files && files.length > 0) {
            attachments = files.map(file => ({
                url: `chat-attachments/${file.filename}`,
                type: file.mimetype,
                name: file.originalname,
                size: file.size
            }));
            messageType = 'image';
        }

        const chat = await Chat.create(
            {
                senderId,
                receiverId,
                message: message || '',
                messageType,
                attachments,
                isRead: false
            },
            { transaction }
        );

        const chatDetail = await Chat.findByPk(chat.id, {
            include: [
                {
                    model: db.User,
                    as: 'sender',
                    include: [
                        {
                            model: db.Shop,
                            as: 'shop',
                            required: false,
                            attributes: ['id', 'shop_name', 'logo_url']
                        }
                    ]
                },
                {
                    model: db.User,
                    as: 'receiver',
                    include: [
                        {
                            model: db.Shop,
                            as: 'shop',
                            required: false,
                            attributes: ['id', 'shop_name', 'logo_url']
                        }
                    ]
                }
            ],
            transaction: transaction
        })

        // Đếm số tin nhắn chưa đọc cho receiver
        const unreadCountForReceiver = await db.Chat.count({
            where: {
                senderId,
                receiverId,
                isRead: false
            },
            transaction
        });
        // Cập nhật Conversation cho người gửi (senderId -> receiverId)
        await db.Conversation.upsert(
            {
                userId: senderId,
                otherUserId: receiverId,
                lastMessageId: chat.id,
                unreadCount: 0
            },
            { transaction }
        );

        // Cập nhật Conversation cho người nhận (receiverId -> senderId)
        await db.Conversation.upsert(
            {
                userId: receiverId,
                otherUserId: senderId,
                lastMessageId: chat.id,
                unreadCount: unreadCountForReceiver
            },
            { transaction }
        );

        // Gửi socket NEW_MESSAGE cho cả sender và receiver
        pushNotificationUser(receiverId, {
            type: WebSocketNotificationType.NEW_MESSAGE,
            data: chatDetail
        });
        pushNotificationUser(senderId, {
            type: WebSocketNotificationType.NEW_MESSAGE,
            data: chatDetail
        }); // Dùng để cập nhật unreadCount trong update conversation socket

        /** Nếu là shop và offline thì tạo tin nhắn thông báo **/
        if (receiver.shopId) {
            const shopWs = ShopClient.get(receiver.shopId);
            const shopOwnerWs = UserClient.get(receiverId);

            if (
                (!shopWs && !shopOwnerWs) ||
                (shopWs && shopWs.readyState !== shopWs.OPEN) ||
                (shopOwnerWs && shopOwnerWs.readyState !== shopOwnerWs.OPEN)
            ) {
                const offlineMessage = await Chat.create(
                    {
                        senderId: receiverId,
                        receiverId: senderId,
                        message: "Cửa hàng hiện đang Offline",
                        messageType: 'text',
                        attachments: null,
                        isRead: false
                    },
                    { transaction }
                );

                const offlineChatDetail = await Chat.findByPk(offlineMessage.id, {
                    include: [
                        { model: db.User, as: 'sender' },
                        { model: db.User, as: 'receiver' }
                    ],
                    transaction: transaction
                });

                // Đếm lại unreadCount sau khi thêm tin nhắn offline
                const unreadCountForSender = await db.Chat.count({
                    where: {
                        receiverId: senderId,
                        senderId: receiverId,
                        isRead: false
                    },
                    transaction
                });

                // Cập nhật lại Conversation cho người gửi
                await db.Conversation.upsert(
                    {
                        userId: senderId,
                        otherUserId: receiverId,
                        lastMessageId: offlineMessage.id,
                        unreadCount: unreadCountForSender
                    },
                    { transaction }
                );

                // Cập nhật lại Conversation cho người nhận (receiverId)
                await db.Conversation.upsert(
                    {
                        userId: receiverId,
                        otherUserId: senderId,
                        lastMessageId: offlineMessage.id,
                        unreadCount: unreadCountForReceiver
                    },
                    { transaction }
                );

                pushNotificationUser(senderId, {
                    type: WebSocketNotificationType.NEW_MESSAGE,
                    data: offlineChatDetail
                });
            }
        }

        await transaction.commit();
        return ResponseModel.success('Tạo tin nhắn', {
            chatInfo: chatDetail
        })
    } catch (error) {
        await transaction.rollback();
        if (files && files.length > 0) {
            await handleDeleteImages(files.map(file => `chat-attachments/${file.filename}`));
        }
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const createConversation = async (userId, shopOwnerId) => {
    const transaction = await sequelize.transaction();
    try {
        if (!shopOwnerId) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                shopOwnerId: shopOwnerId
            })
        }

        const existingConversation = await db.Conversation.findOne({
            where: {
                [Op.or]: [
                    { userId: userId, otherUserId: shopOwnerId },
                    { userId: shopOwnerId, otherUserId: userId }
                ]
            }
        })

        if (existingConversation) {
            const lastMessage = await db.Chat.findByPk(existingConversation.lastMessageId);
            await transaction.commit();
            return ResponseModel.success('Đã có cuộc trò chyện', {
                chatInfo: lastMessage
            })
        }

        const welcomeMessage = await db.Chat.create(
            {
                senderId: shopOwnerId,
                receiverId: userId,
                message: "Xin chào! Cảm ơn bạn đã quan tâm đến cửa hàng của chúng tôi. Chúng tôi có thể giúp gì cho bạn?",
                messageType: 'text',
                isRead: false,
            },
            { transaction }
        );

        await db.Conversation.upsert(
            {
                userId: userId,
                otherUserId: shopOwnerId,
                lastMessageId: welcomeMessage.id,
                unreadCount: 0
            },
            { transaction }
        );

        await db.Conversation.upsert(
            {
                userId: shopOwnerId,
                otherUserId: userId,
                lastMessageId: welcomeMessage.id,
                unreadCount: 0
            },
            { transaction }
        );

        /** Gửi socket nếu người nhận online **/
        pushNotificationUser(userId, {
            type: WebSocketNotificationType.NEW_MESSAGE,
            data: welcomeMessage
        });

        await transaction.commit();
        return ResponseModel.success('Tạo cuộc trò chuyện thành công', {
            chatInfo: welcomeMessage
        });
    } catch (error) {
        await transaction.rollback();
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}