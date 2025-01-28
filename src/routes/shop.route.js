import express from 'express';
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

ShopRouter.post('/shop', createNewShop);

ShopRouter.put('/shop/:id', updateShopById);

ShopRouter.delete('/shop', deleteShopById);

export default ShopRouter;