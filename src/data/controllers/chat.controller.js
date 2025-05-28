import HttpErrors from "../../common/errors/http-errors";
import { ResponseModel } from "../../common/errors/response";
import * as ChatService from "../services/chat.service";

export const fetchChatHistory = async (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 20 } = req.query;

        if (req.user.id !== parseInt(userId) && !req.user.shopId) {
            ResponseModel.error(
                HttpErrors.BAD_REQUEST,
                'Unauthorized to view these messages',
                {}
            )
        }

        const response = await ChatService.fetchChatHistory(
            req.user.id,
            parseInt(userId),
            parseInt(page),
            parseInt(limit)
        );

        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status || HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        })
    }
}

export const fetchConversations = async (req, res) => {
    try {
        const userId = req.user.id;
        const response = await ChatService.fetchConversations(userId);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status || HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        })
    }
}

export const markMessageAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const { messageId } = req.params;
        const response = await ChatService.markMessageAsRead(parseInt(messageId), userId);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status || HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        })
    }
}

export const markConversationAsRead = async (req, res) => {
    try {
        const { userId } = req.params;
        const response = await ChatService.markConversationAsRead(
            parseInt(userId),
            req.user.id
        );
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status || HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        })
    }
}

export const createMessage = async (req, res) => {
    try {
        const { receiverId, message } = req.body;
        const files = req.files;
        const response = await ChatService.createMessage(
            req.user.id,
            parseInt(receiverId),
            message,
            files
        );
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status || HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        })
    }
}

