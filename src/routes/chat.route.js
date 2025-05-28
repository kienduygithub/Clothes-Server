import express from 'express';
import * as ChatController from "../data/controllers/chat.controller";
import {
    checkUserAuthenticationMobile
} from "../common/middleware/jwt.middleware";
import { uploadServer } from '../common/middleware/upload.middleware';
const ChatRouter = express.Router();

ChatRouter.get(
    '/chat/conversations',
    checkUserAuthenticationMobile,
    ChatController.fetchConversations
);

ChatRouter.get(
    '/chat/history/:userId',
    checkUserAuthenticationMobile,
    ChatController.fetchChatHistory
);

ChatRouter.post(
    '/chat/send',
    checkUserAuthenticationMobile,
    uploadServer.array('chatAttachments', 5),
    ChatController.createMessage
);

ChatRouter.post(
    '/chat/conversation',
    checkUserAuthenticationMobile,
    ChatController.createConversation
);

ChatRouter.patch(
    '/chat/read/:messageId',
    checkUserAuthenticationMobile,
    ChatController.markMessageAsRead
);

ChatRouter.patch(
    '/chat/read-conversation/:userId',
    checkUserAuthenticationMobile,
    ChatController.markConversationAsRead
);

export default ChatRouter;