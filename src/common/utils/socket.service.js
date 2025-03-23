import { WebSocketServer } from 'ws';

const UserClient = new Map();

const ShopClient = new Map();

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
            }

            if (ws.shopId) {
                ShopClient.delete(ws.shopId);
                console.log(`User ${ws.shopId} disconnected`);
            }
        });

        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message);
                if (data.type === 'register') {
                    if (data.userId) {
                        UserClient.set(data.userId, ws);
                        console.log(`User ${data.userId} connected`);
                        console.log('>>> Active clients: ', Array.from(UserClient.keys()));
                        return;
                    }

                    if (data.shopId) {
                        ShopClient.set(data.shopId, ws);
                        console.log(`Shop ${data.shopId} connected`);
                        console.log('>>> Active shops: ', Array.from(ShopClient.keys()));
                        return
                    }

                } else if (data.type === 'logout') {
                    if (data.userId) {
                        UserClient.delete(data.userId);
                        console.log(`User ${data.userId} logged out`);
                        console.log('>>> Active clients: ', Array.from(UserClient.keys()));
                        return;
                    }

                    if (data.shopId) {
                        ShopClient.delete(data.shopId);
                        console.log(`Shop ${data.shopId} logged out`);
                        console.log('>>> Active shops: ', Array.from(ShopClient.keys()));
                        return
                    }
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

export const pushNotificationShop = (shop_id, message) => {
    const ws = ShopClient.get(shop_id);
    if (ws && ws.readyState === ws.OPEN) {
        try {
            const data = typeof message === 'string' ? message : JSON.stringify(message);
            ws.send(data);
            return true;
        } catch (error) {
            console.log(`>>> Error sending message to shop ${shop_id}: `, error);
            return false;
        }
    } else {
        console.log(`Shop ${shop_id} is not connected`);
    }
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