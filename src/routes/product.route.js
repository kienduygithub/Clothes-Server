import express from 'express';
import {
    uploadServer
} from '../common/middleware/upload.middleware';
import * as ProductController from '../data/controllers/product.controller';
import { checkUserAuthentication } from '../common/middleware/jwt.middleware';

const ProductRouter = express.Router();

/** MOBILE */
ProductRouter.get(
    '/product/search-and-filter',
    ProductController.searchAndFilterProductsMobile
)

ProductRouter.get(
    '/product/search-and-filter/shop/:shopId',
    ProductController.searchAndFilterProductShopMobile
)

ProductRouter.get(
    '/product/search-and-filter/category/:categoryId',
    ProductController.searchAndFilterProductsByParentCategoryMobile
)

ProductRouter.get(
    '/product/latest/search-and-filter',
    ProductController.searchAndFilterLatestProductsMobile
)

ProductRouter.get(
    '/product/:id/mobile',
    ProductController.fetchProductMobileById
);

ProductRouter.get(
    '/product/shop/:shopId/mobile',
    ProductController.fetchProductMobilesByShopId
);

ProductRouter.get(
    '/product/:id/variants/mobile',
    ProductController.fetchProductVariantMobileByProductId
);

ProductRouter.get(
    '/product/mobile',
    ProductController.fetchProductMobiles
);

ProductRouter.get(
    '/product/:shopId/:productId/relative',
    ProductController.fetchListRelativeProductInShop
)

ProductRouter.get(
    '/product/latest',
    ProductController.fetchLatestProduct
)

ProductRouter.get(
    '/product/:id',
    checkUserAuthentication,
    ProductController.fetchProductById
);

ProductRouter.get(
    '/product',
    ProductController.fetchAllProduct
);

ProductRouter.post(
    '/product',
    checkUserAuthentication,
    uploadServer.fields([
        { name: 'infoImages', maxCount: 10 },
        { name: 'variantImages', maxCount: 30 },
    ]),
    ProductController.createNewProduct
);

ProductRouter.patch(
    '/product/:id',
    checkUserAuthentication,
    uploadServer.fields([
        { name: 'infoImages', maxCount: 10 },
        { name: 'variantImages', maxCount: 30 },
        { name: 'variantUpdateImages', maxCount: 30 }
    ]),
    ProductController.updateProduct
);

ProductRouter.delete(
    '/product/:id',
    checkUserAuthentication,
    ProductController.deleteProductById
);


export default ProductRouter;