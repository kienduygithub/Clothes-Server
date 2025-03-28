import express from "express";
import { checkUserAuthentication } from "../common/middleware/jwt.middleware";
import * as FavoriteController from "../data/controllers/favorite.controller";

const FavoriteRouter = express.Router();

FavoriteRouter.get(
    '/product-favorite/user/:userId',
    // checkUserAuthentication,
    FavoriteController.fetchFavoritesByUser
);

FavoriteRouter.post(
    '/product-favorite/user/:userId/product/:productId',
    // checkUserAuthentication,
    FavoriteController.favoriteProductByUser
);

FavoriteRouter.post(
    '/product-favorite/user/:userId/product/:productId/unfavorite',
    // checkUserAuthentication,
    FavoriteController.unfavoriteProductByUser
);

export default FavoriteRouter;