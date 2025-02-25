import express from 'express';
import {
    uploadServer
} from '../common/middleware/upload.middleware';
import {
    fetchAllProductsInShop,
    fetchAllShop,
    fetchShopById,
    createNewShop,
    updateShopById,
    deleteShopById
} from '../data/controllers/shop.controller';
import { checkUserAuthentication } from '../common/middleware/jwt.middleware';
const ShopRouter = express.Router();

ShopRouter.get(
    '/shop/all',
    fetchAllShop
);

ShopRouter.get(
    '/shop/admin/:id',
    checkUserAuthentication,
    fetchShopById
);

ShopRouter.get(
    '/shop/:id',
    checkUserAuthentication,
    fetchAllProductsInShop
);

ShopRouter.post(
    '/shop/admin/create',
    checkUserAuthentication,
    uploadServer.fields([
        { name: 'logoShopFile', maxCount: 1 },
        { name: 'backgroundShopFile', maxCount: 1 }
    ]),
    createNewShop
);

ShopRouter.patch(
    '/shop/admin/:id',
    checkUserAuthentication,
    uploadServer.fields([
        { name: 'logoShopFile', maxCount: 1 },
        { name: 'backgroundShopFile', maxCount: 1 }
    ]),
    updateShopById
);

ShopRouter.delete(
    '/shop/admin/:id',
    checkUserAuthentication,
    deleteShopById
);

export default ShopRouter;