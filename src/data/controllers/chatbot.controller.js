import * as chatbotService from '../services/chatbot.service';

// Initialize a new chat session
export const initChat = async (req, res) => {
    try {
        const { userId } = req.body;
        const result = await chatbotService.initChat(userId);

        return res.status(200).json({
            success: true,
            message: 'Chat initialized successfully',
            data: result
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Error initializing chat'
        });
    }
};

// Send a message to the chatbot and get a response (for logged-in users)
export const sendMessage = async (req, res) => {
    try {
        const { userId, message } = req.body;

        if (!message) {
            return res.status(400).json({
                success: false,
                message: 'Message is required'
            });
        }

        const response = await chatbotService.processMessage(userId, message);

        return res.status(200).json({
            success: true,
            data: response
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Error processing message'
        });
    }
};

// Send a message to the chatbot for guest users (no history storage)
export const sendGuestMessage = async (req, res) => {
    try {
        const { message, sessionId } = req.body;

        if (!message) {
            return res.status(400).json({
                success: false,
                message: 'Message is required'
            });
        }

        // Use a special service method that doesn't store history
        const response = await chatbotService.processGuestMessage(message, sessionId);

        return res.status(200).json({
            success: true,
            data: response
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Error processing guest message'
        });
    }
};

// Get chat history for a user
export const getChatHistory = async (req, res) => {
    try {
        const userId = req.params.userId;

        const chatHistory = await chatbotService.getChatHistory(userId);

        return res.status(200).json({
            success: true,
            data: chatHistory
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Error retrieving chat history'
        });
    }
};

// Get guest chat session
export const getGuestSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const chatHistory = chatbotService.getGuestChatHistory(sessionId);

        return res.status(200).json({
            success: true,
            data: chatHistory
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Error retrieving guest chat history'
        });
    }
};
