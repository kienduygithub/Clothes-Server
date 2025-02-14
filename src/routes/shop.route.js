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
const ShopRouter = express.Router();

ShopRouter.get('/shop/all', fetchAllShop);

ShopRouter.get('/shop/admin/:id', fetchShopById);

ShopRouter.get('/shop/:id', fetchAllProductsInShop);

ShopRouter.post(
    '/shop/admin/create',
    uploadServer.fields([
        { name: 'logoShopFile', maxCount: 1 },
        { name: 'backgroundShopFile', maxCount: 1 }
    ]),
    createNewShop
);

ShopRouter.patch(
    '/shop/admin/:id',
    uploadServer.fields([
        { name: 'logoShopFile', maxCount: 1 },
        { name: 'backgroundShopFile', maxCount: 1 }
    ]),
    updateShopById
);

ShopRouter.delete('/shop/admin/:id', deleteShopById);

export default ShopRouter;