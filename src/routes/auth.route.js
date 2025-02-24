import express from "express";
import {
    signIn,
    signInMobile,
    signUp,
    signUpMobile,
    fetchDetailUser
} from "../data/controllers/auth.controller";
const AuthRouter = express.Router();

AuthRouter.post('/auth/sign-in', signIn);

AuthRouter.post('/auth/sign-up', signUp);

AuthRouter.post('/auth/sign-in/mobile', signInMobile);

AuthRouter.post('/auth/sign-up/mobile', signUpMobile);

AuthRouter.get('/auth/user-details/:id', fetchDetailUser);

export default AuthRouter;