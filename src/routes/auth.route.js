import express from "express";
import {
    signIn,
    signInMobile,
    signUp,
    signUpMobile,
    fetchDetailUser,
    registerShopMobile,
    checkUserForShopRegistration,
    changePassword,
    fetchDetailUserWithAuth,
    editAccountDetails,
    fetchNewShopsStats,
    fetchOrderActivityStats,
    fetchProductPerformanceStats,
    fetchShopRevenueStats,
    fetchProductCategoryStats
} from "../data/controllers/auth.controller";
import {
    checkUserAuthentication,
    checkUserAuthenticationMobile,
    refreshTokenMobile,
    refreshTokenWeb
} from "../common/middleware/jwt.middleware";
import { uploadServer } from "../common/middleware/upload.middleware";

const AuthRouter = express.Router();

AuthRouter.post(
    '/account/change-password',
    checkUserAuthentication,
    changePassword
)

AuthRouter.post(
    '/auth/sign-up',
    uploadServer.fields([
        { name: 'logoShopFile', maxCount: 1 },
        { name: 'backgroundShopFile', maxCount: 1 },
    ]),
    signUp
);

AuthRouter.post('/auth/sign-in', signIn);

AuthRouter.post('/auth/sign-in/mobile', signInMobile);

AuthRouter.post('/auth/sign-up/mobile', uploadServer.single('userFile'), signUpMobile);

AuthRouter.post('/auth/refresh', refreshTokenWeb);

AuthRouter.post('/auth/refresh/mobile', refreshTokenMobile);

AuthRouter.get('/auth/user-details/:id', checkUserAuthentication, fetchDetailUser);

AuthRouter.get('/auth/user-details', checkUserAuthentication, fetchDetailUserWithAuth);

AuthRouter.patch(
    '/auth/edit-details',
    checkUserAuthentication,
    uploadServer.single('adminOwnerFile'),
    editAccountDetails
)

AuthRouter.post(
    '/shop/register-shop/mobile',
    checkUserAuthenticationMobile,
    uploadServer.fields([
        { name: 'logoShopFile', maxCount: 1 },
        { name: 'backgroundShopFile', maxCount: 1 },
    ]),
    registerShopMobile
)

AuthRouter.post(
    '/shop/register-check',
    checkUserForShopRegistration
)

AuthRouter.post(
    '/admin/shop-stats',
    fetchNewShopsStats
)

AuthRouter.post(
    '/admin/order-activity-stats',
    fetchOrderActivityStats
)

AuthRouter.post(
    '/admin/product-performance-stats',
    fetchProductPerformanceStats
)

AuthRouter.post(
    '/admin/shop-revenue-stats',
    fetchShopRevenueStats
)

AuthRouter.post(
    '/admin/category-product-count',
    fetchProductCategoryStats
)

export default AuthRouter;