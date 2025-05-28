import express from 'express';
import * as ChatController from "../data/controllers/chat.controller";
import {
    checkUserAuthenticationMobile
} from "../common/middleware/jwt.middleware";
import { uploadServer } from '../common/middleware/upload.middleware';
const ChatRouter = express.Router();

ChatRouter.get(
    '/conversations',
    checkUserAuthenticationMobile,
    ChatController.fetchConversations
);

ChatRouter.get(
    '/history/:userId',
    checkUserAuthenticationMobile,
    ChatController.fetchChatHistory
);

ChatRouter.post(
    '/send',
    checkUserAuthenticationMobile,
    uploadServer.array('chatAttachments', 5),
    ChatController.createMessage
);

ChatRouter.patch(
    '/read/:messageId',
    checkUserAuthenticationMobile,
    ChatController.markMessageAsRead
);

ChatRouter.patch(
    '/read-conversation/:userId',
    checkUserAuthenticationMobile,
    ChatController.markConversationAsRead
);

export default ChatRouter;