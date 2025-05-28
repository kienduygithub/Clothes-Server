import { Op } from "sequelize";
import { Chat, sequelize, User } from "../models";
import { ResponseModel } from "../../common/errors/response";
import {
    pushNotificationUser,
    ShopClient
} from "../../common/utils/socket.service";
import HttpErrors from "../../common/errors/http-errors";
import { handleDeleteImages } from "../../common/middleware/upload.middleware";

export const fetchChatHistory = async (userId1, userId2, page = 1, limit = 20) => {
    try {
        const offset = (page - 1) * limit;

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
                    attributes: ['id', 'name', 'image_url', 'shopId']
                },
                {
                    model: User,
                    as: 'receiver',
                    attributes: ['id', 'name', 'image_url', 'shopId']
                }
            ],
            order: [['createdAt', 'DESC']],
            limit,
            offset
        });

        return ResponseModel.success('Lịch sử hội thoại', {
            messages: messages.rows,
            paginate: {
                currentPage: page,
                limit: limit,
                totalItems: messages.count,
                totalPages: Math.ceil(messages.count / limit),
            },
        })
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

/** Output: Danh sách các cuộc trò chuyện của một user **/
export const fetchConversations = async (userId) => {
    try {
        /** 1. Lấy tin nhắn mới nhất của mỗi cuộc trò chuyện **/
        const conversations = await Chat.findAll({
            where: {
                [Op.or]: [
                    { senderId: userId },
                    { receiverId: userId }
                ]
            },
            include: [
                {
                    model: User,
                    as: 'sender',
                    attributes: ['id', 'name', 'image_url', 'shopId']
                },
                {
                    model: User,
                    as: 'receiver',
                    attributes: ['id', 'name', 'image_url', 'shopId']
                },
            ],
            order: [['createdAt', 'DESC']]
        });
        /** 2. Nhóm theo người trò chuyện và lấy tin nhắn mới nhất **/
        const conversationMap = new Map();
        conversations.forEach(chat => {
            const otherUserId = chat.senderId === userId ? chat.receiverId : chat.senderId;
            if (!conversationMap.has(otherUserId)) {
                conversationMap.set(otherUserId, {
                    otherUser: chat.senderId === userId ? chat.receiver : chat.sender,
                    lastMessage: chat,
                    unreadCount: chat.senderId !== userId && !chat.isRead ? 1 : 0
                });
            } else if (chat.ResponseModel !== userId && !chat.isRead) {
                const conversation = conversationMap.get(otherUserId);
                conversationMap.set(otherUserId, {
                    ...conversation,
                    unreadCount: conversation.unreadCount + 1
                })
            }
        })

        return ResponseModel.success('Danh sách trò chuyện', {
            conversations: Array.from(conversationMap.values())
        })
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const markMessageAsRead = async (messageId, readerId) => {
    const transaction = await sequelize.transaction();
    try {
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
        await Chat.update(
            { isRead: true },
            {
                where: {
                    receiverId: userId1,
                    senderId: userId2
                },
                transaction
            }
        )

        await transaction.commit();

        return ResponseModel.success('Đánh dấu trò chuyện đã đọc', {});
    } catch (error) {
        await transaction.rollback();
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const createMessage = async (senderId, receiverId, message, files = null) => {
    try {
        const receiver = await User.findByPk(receiverId);
        if (!receiver) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Receiver not found', {});
        }

        let messageType = 'text';
        let attachments = null;

        if (files && files.length > 0) {
            attachments = files.map(file => ({
                url: `chat-attachments/${file.filename}`,
                type: file.mimetype,
                name: file.originalname,
                size: file.size
            }));
            messageType = 'image';
        }

        const chat = await Chat.create({
            senderId,
            receiverId,
            message,
            messageType: messageType,
            attachments: attachments,
            isRead: false,
        });

        /** Gửi socket nếu người nhận online **/
        pushNotificationUser(receiverId, {
            type: 'new_message',
            data: chat
        })

        /** Nếu là shop và offline thì tạo tin nhắn thông báo **/
        if (receiver.shopId) {
            const shopWs = ShopClient.get(receiver.shopId);
            if (!shopWs || shopWs.readyState !== shopWs.OPEN) {
                await createMessage(
                    receiverId, // Shop gửi
                    senderId, // Gửi cho người dùng ban đầu
                    "Cửa hàng hiện đang Offline"
                );
            }
        }

        return ResponseModel.success('Tạo tin nhắn', {
            chatInfo: chatInfo
        })
    } catch (error) {
        if (files && files.length > 0) {
            await handleDeleteImages(files.map(file => `chat-attachments/${file.filename}`));
        }
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}