import express from 'express';
import * as chatbotController from '../data/controllers/chatbot.controller';

const router = express.Router();

router.post('/chatbot/session', chatbotController.createSession);
router.get('/chatbot/sessions', chatbotController.getSessions);
router.get('/chatbot/history', chatbotController.getChatHistoryBySession);
router.post('/chatbot/message', chatbotController.sendMessageToSession);

export default router;