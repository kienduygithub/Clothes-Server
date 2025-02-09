import express from 'express';
import {
    uploadServer
} from '../common/middleware/upload.middleware';
import {
    fetchAllUser,
    fetchUserById,
    createUserAdmin,
    deleteUserAdmin,
    updateUserAdmin
} from "../data/controllers/user.controller";

const UserRouter = express.Router();

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
