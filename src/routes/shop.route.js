import express from 'express';
import {
    uploadServer
} from '../common/middleware/upload.middleware';
import {
    fetchAllProductsInShop,
    fetchAllShop,
    createNewShop,
    updateShopById,
    deleteShopById
} from '../data/controllers/shop.controller';
const ShopRouter = express.Router();

ShopRouter.get('/shop/:id', fetchAllProductsInShop);

ShopRouter.get('/shop', fetchAllShop);

ShopRouter.post(
    '/shop/admin/create',
    uploadServer.fields([
        { name: 'logoShopFile', maxCount: 1 },
        { name: 'backgroundShopFile', maxCount: 1 }
    ]),
    createNewShop
);

ShopRouter.put('/shop/admin/:id', updateShopById);

ShopRouter.delete('/shop/admin/:id', deleteShopById);

export default ShopRouter;