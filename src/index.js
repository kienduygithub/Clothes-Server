import cors from 'cors';
import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import connectDB from './config/connectDB';
import initViewEngine from './config/viewEngine';

import UserRouter from "./routes/user.route";
import ShopRouter from "./routes/shop.route";
import ProductRouter from "./routes/product.route";
import AttributeRouter from './routes/attribute.route';
import CategoryRouter from './routes/category.route';
import AuthRouter from './routes/auth.route';
import { verifyMailer } from './common/mails/mailer.config';
import CouponRouter from './routes/coupon.route';
import AddressRouter from './routes/address.route';
import ReviewRouter from './routes/review.route';
import { initWebSocket } from './common/utils/socket.service';
import SocketIORouter from './routes/socket-io.route';
import FavoriteRouter from './routes/favorite.route';
import CartRouter from './routes/cart.route';
import OrderRouter from './routes/order.route';
import ChatHistoryRouter from './routes/chatbot.route';
import NotificationRouter from './routes/notification.route';
import ChatRouter from './routes/chat.route';

require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    credentials: true,
    allowedHeaders: '*'
}));

app.options('*', cors({
    origin: 'http://localhost:4200',
    credentials: true,
}));


app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

connectDB();
initViewEngine(app);
verifyMailer();

app.get('/', (req, res) => {
    res.send('Welcocme to Node babel');
});

app.use(
    '/api',
    UserRouter,
    ShopRouter,
    ProductRouter,
    AttributeRouter,
    CouponRouter,
    CategoryRouter,
    AuthRouter,
    AddressRouter,
    ReviewRouter,
    FavoriteRouter,
    CartRouter,
    OrderRouter,
    ChatHistoryRouter,
    NotificationRouter,
    SocketIORouter,
    ChatRouter
);

app.listen(port, () => {
    console.log(`>>> Welcome to clothes server: http://localhost:${port}`);
})

initWebSocket();