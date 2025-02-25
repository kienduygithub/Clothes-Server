import express from 'express';
import {
    uploadServer
} from '../common/middleware/upload.middleware';
import {
    fetchProductMobileById,
    fetchProductById,
    fetchAllProduct,
    createNewProduct,
    updateProduct,
    deleteProductById
} from '../data/controllers/product.controller';
import { checkUserAuthentication } from '../common/middleware/jwt.middleware';


const ProductRouter = express.Router();

ProductRouter.get('/product/:id/mobile', fetchProductMobileById);

ProductRouter.get(
    '/product/:id',
    checkUserAuthentication,
    fetchProductById
);

ProductRouter.get(
    '/product',
    fetchAllProduct
);

ProductRouter.post(
    '/product',
    checkUserAuthentication,
    uploadServer.fields([
        { name: 'infoImages', maxCount: 10 },
        { name: 'variantImages', maxCount: 30 },
    ]),
    createNewProduct
);

ProductRouter.patch(
    '/product/:id',
    checkUserAuthentication,
    uploadServer.fields([
        { name: 'infoImages', maxCount: 10 },
        { name: 'variantImages', maxCount: 30 },
        { name: 'variantUpdateImages', maxCount: 30 }
    ]),
    updateProduct
);

ProductRouter.delete(
    '/product/:id',
    checkUserAuthentication,
    deleteProductById
)

export default ProductRouter;