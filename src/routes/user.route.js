import express from 'express';
import {
    uploadServer
} from '../common/middleware/upload.middleware';
import {
    fetchAllUser,
    fetchUserById,
    createUserAdmin,
    deleteUserAdmin,
    updateUserAdmin,
    fetchUserInfo,
    editAvatarUser,
    editUserInfo
} from "../data/controllers/user.controller";
import {
    checkUserAuthenticationMobile
} from "../common/middleware/jwt.middleware";
const UserRouter = express.Router();

/** MOBILE */
UserRouter.get(
    '/user/info/mobile',
    checkUserAuthenticationMobile,
    fetchUserInfo
)

UserRouter.patch(
    '/user/info/mobile',
    checkUserAuthenticationMobile,
    editUserInfo
);

UserRouter.post(
    '/user/avatar/mobile',
    checkUserAuthenticationMobile,
    uploadServer.single('userFile'),
    editAvatarUser
)

UserRouter.get('/user/all', fetchAllUser);

UserRouter.get('/user/:id', fetchUserById);

UserRouter.post(
    '/user/admin/create',
    uploadServer.single('adminOwnerFile'),
    createUserAdmin
);

UserRouter.delete('/user/admin/:id', deleteUserAdmin);

UserRouter.patch(
    '/user/admin/:id',
    uploadServer.single('adminOwnerFile'),
    updateUserAdmin
);

export default UserRouter;
