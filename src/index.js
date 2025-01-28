import cors from 'cors';
import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import connectDB from './config/connectDB';
import initViewEngine from './config/viewEngine';

import UserRouter from "./routes/user.route";
import ShopRouter from "./routes/shop.route";
import ProductRouter from "./routes/product.route";

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

app.get('/', (req, res) => {
    res.send('Welcocme to Node babel');
});

app.use(
    '/api',
    UserRouter,
    ShopRouter,
    ProductRouter
);

app.listen(port, () => {
    console.log(`>>> Welcome to clothes server: http://localhost:${port}`);
})