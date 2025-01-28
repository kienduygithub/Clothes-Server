import express from 'express';
import {
    uploadProducts
} from '../common/middleware/upload.middleware';
import {
    fetchProductMobileById,
    fetchProductById,
    fetchAllProduct,
    createNewProduct,
    updateProduct
} from '../data/controllers/product.controller';


const ProductRouter = express.Router();

ProductRouter.get('/product/:id/mobile', fetchProductMobileById);

ProductRouter.get('/product/:id', fetchProductById);

ProductRouter.get('/product', fetchAllProduct);

ProductRouter.post('/product', uploadProducts.array('infoImages', 10), createNewProduct);

ProductRouter.patch('/product/:id', uploadProducts.array('infoImages', 10), updateProduct);

export default ProductRouter;