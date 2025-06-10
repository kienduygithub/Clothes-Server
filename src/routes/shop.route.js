import express from 'express';
import {
    uploadServer
} from '../common/middleware/upload.middleware';
import {
    fetchAllProductsInShop,
    fetchAllShop,
    fetchRegisterShops,
    fetchShopById,
    createNewShop,
    updateShopById,
    deleteShopById,
    declineRegisterShopById,
    acceptRegisterShopById,
    fetchPopularProductsByShop,
    fetchLatestProductsByShop,
    fetchPriceProductsByShop,
    fetchParentCategoriesWithTotalProductByShop,
    fetchProductsByParentCategoryInShop,
    fetchListShopNotPending,
    withdrawalMoneyByOwner,
    fetchListWithdrawalHistories,
    fetchBalanceShop,
    fetchShopByTokenId,
    fetchListLatestOrderShop
} from '../data/controllers/shop.controller';
import { checkUserAuthentication } from '../common/middleware/jwt.middleware';
const ShopRouter = express.Router();

ShopRouter.post(
    '/shop/order/latest',
    checkUserAuthentication,
    fetchListLatestOrderShop
)

ShopRouter.get(
    '/shop/all',
    fetchAllShop
);

ShopRouter.get(
    '/shop/active',
    fetchListShopNotPending
);

ShopRouter.get(
    '/shop/admin/:id',
    checkUserAuthentication,
    fetchShopById
);

ShopRouter.get(
    '/shop/owner/token-shop',
    checkUserAuthentication,
    fetchShopByTokenId
);

ShopRouter.get(
    '/shop/register-shops',
    // checkUserAuthentication,
    fetchRegisterShops
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
        { name: 'adminOwnerFile', maxCount: 1 },
        { name: 'logoShopFile', maxCount: 1 },
        { name: 'backgroundShopFile', maxCount: 1 }
    ]),
    createNewShop
);

ShopRouter.patch(
    '/shop/admin/:id',
    checkUserAuthentication,
    uploadServer.fields([
        { name: 'adminOwnerFile', maxCount: 1 },
        { name: 'logoShopFile', maxCount: 1 },
        { name: 'backgroundShopFile', maxCount: 1 }
    ]),
    updateShopById
);

ShopRouter.post(
    '/shop/decline-register/:id',
    // checkUserAuthentication,
    declineRegisterShopById
);

ShopRouter.post(
    '/shop/accept-register/:id',
    // checkUserAuthentication,
    acceptRegisterShopById
);

ShopRouter.delete(
    '/shop/admin/:id',
    checkUserAuthentication,
    deleteShopById
);

/** Mobile */
ShopRouter.get(
    '/shop/:id/mobile',
    fetchShopById
);

ShopRouter.get(
    '/shop/:id/product/best-sellers',
    fetchPopularProductsByShop
)

ShopRouter.get(
    '/shop/:id/product/recents',
    fetchLatestProductsByShop
)

ShopRouter.get(
    '/shop/:id/product/prices',
    fetchPriceProductsByShop
)

ShopRouter.get(
    '/shop/:id/category-products',
    fetchParentCategoriesWithTotalProductByShop
)

ShopRouter.get(
    '/shop/:id/category/:categoryId/products',
    fetchProductsByParentCategoryInShop
)

ShopRouter.post(
    '/shop/withdrawal',
    checkUserAuthentication,
    withdrawalMoneyByOwner
)

ShopRouter.get(
    '/shop/withdrawal/history',
    checkUserAuthentication,
    fetchListWithdrawalHistories
)

ShopRouter.get(
    '/shop/balance/get',
    checkUserAuthentication,
    fetchBalanceShop
)
export default ShopRouter;