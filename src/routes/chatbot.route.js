import express from 'express';
import * as chatbotController from '../data/controllers/chatbot.controller';

const ChatHistoryRouter = express.Router();

ChatHistoryRouter.post(
    '/chatbot/message',
    chatbotController.sendMessage
)

ChatHistoryRouter.get(
    '/chatbot/history',
    chatbotController.getChatHistory
)

ChatHistoryRouter.post(
    '/chatbot/history',
    chatbotController.saveChatHistory
)

ChatHistoryRouter.post(
    '/chatbot/product-search',
    chatbotController.productSearch
)

ChatHistoryRouter.get(
    '/chatbot/test-connection',
    chatbotController.testConnection
)

ChatHistoryRouter.get(
    '/chatbot/list-models',
    chatbotController.listModels
)

export default ChatHistoryRouter