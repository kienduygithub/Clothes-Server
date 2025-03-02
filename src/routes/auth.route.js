import express from "express";
import {
    signIn,
    signInMobile,
    signUp,
    signUpMobile,
    fetchDetailUser,
} from "../data/controllers/auth.controller";
import {
    checkUserAuthentication,
    refreshTokenWeb
} from "../common/middleware/jwt.middleware";
import { uploadServer } from "../common/middleware/upload.middleware";

const AuthRouter = express.Router();

AuthRouter.post(
    '/auth/sign-up',
    uploadServer.fields([
        { name: 'adminOwnerFile', maxCount: 1 },
        { name: 'logoShopFile', maxCount: 1 },
        { name: 'backgroundShopFile', maxCount: 1 },
    ]),
    signUp
);

AuthRouter.post('/auth/sign-in', signIn);


AuthRouter.post('/auth/sign-in/mobile', signInMobile);

AuthRouter.post('/auth/sign-up/mobile', signUpMobile);

AuthRouter.post('/auth/refresh', refreshTokenWeb);

AuthRouter.get('/auth/user-details/:id', checkUserAuthentication, fetchDetailUser);

export default AuthRouter;