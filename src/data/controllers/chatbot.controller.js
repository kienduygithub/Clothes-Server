import * as chatbotServices from "../services/chatbot.service";

export const testConnection = async (req, res) => {
    try {
        const response = await chatbotServices.testGeminiConnection();
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(500).json({
            status: 500,
            message: 'TEST_CONNECTION_ERROR',
            body: {
                error: error.message
            }
        });
    }
};

export const sendMessage = async (req, res) => {
    try {
        const { message, user_id } = req.body;
        const response = await chatbotServices.sendMessage(message, user_id);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status || 500).json({
            status: error?.status || 500,
            message: error?.message || 'UNKNOWN',
            body: error?.body
        });
    }
}

export const getChatHistory = async (req, res) => {
    try {
        const userId = req.query.userId;
        const response = await chatbotServices.getChatHistory(userId);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status || 500).json({
            status: error?.status || 500,
            message: error?.message || 'UNKNOWN',
            body: error?.body
        });
    }
}

export const saveChatHistory = async (req, res) => {
    try {
        const { userId, messages } = req.body;
        const response = await chatbotServices.saveChatHistory(userId, messages);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status || 500).json({
            status: error?.status || 500,
            message: error?.message || 'UNKNOWN',
            body: error?.body
        });
    }
}

export const productSearch = async (req, res) => {
    try {
        const { query, categoryId } = req.body;
        const response = await chatbotServices.productSearch(query, categoryId);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status || 500).json({
            status: error?.status || 500,
            message: error?.message || 'UNKNOWN',
            body: error?.body
        });
    }
}

export const listModels = async (req, res) => {
    try {
        const response = await chatbotServices.listGeminiModels();
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(500).json({
            status: 500,
            message: 'LIST_MODELS_ERROR',
            body: {
                error: error.message
            }
        });
    }
} 