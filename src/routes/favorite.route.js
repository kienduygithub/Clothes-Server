import express from "express";
import { checkUserAuthenticationMobile } from "../common/middleware/jwt.middleware";
import * as FavoriteController from "../data/controllers/favorite.controller";

const FavoriteRouter = express.Router();

FavoriteRouter.get(
    '/product-favorite/user/:userId',
    FavoriteController.fetchFavoritesByUser
);

FavoriteRouter.post(
    '/product-favorite/product/:productId',
    checkUserAuthenticationMobile,
    FavoriteController.favoriteProductByUser
);

FavoriteRouter.post(
    '/product-favorite/product/:productId/unfavorite',
    checkUserAuthenticationMobile,
    FavoriteController.unfavoriteProductByUser
);

export default FavoriteRouter;