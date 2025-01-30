import express from 'express';
import {
    uploadProducts,
} from '../common/middleware/upload.middleware';
import {
    fetchProductMobileById,
    fetchProductById,
    fetchAllProduct,
    createNewProduct,
    updateProduct,
    deleteProductById
} from '../data/controllers/product.controller';


const ProductRouter = express.Router();

ProductRouter.get('/product/:id/mobile', fetchProductMobileById);

ProductRouter.get('/product/:id', fetchProductById);

ProductRouter.get('/product', fetchAllProduct);

ProductRouter.post(
    '/product',
    uploadProducts.fields([
        { name: 'infoImages', maxCount: 10 },
        { name: 'variantImages', maxCount: 30 },
    ]),
    createNewProduct
);

ProductRouter.patch(
    '/product/:id',
    uploadProducts.fields([
        { name: 'infoImages', maxCount: 10 },
        { name: 'variantImages', maxCount: 30 },
        { name: 'variantUpdateImages', maxCount: 30 }
    ]),
    updateProduct
);

ProductRouter.delete(
    '/product/:id',
    deleteProductById
)

export default ProductRouter;