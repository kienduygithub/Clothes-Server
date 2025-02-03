import express from 'express';
import {
    uploadUser
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
    uploadUser.single('adminOwnerFile'),
    createUserAdmin
);

UserRouter.delete('/user/admin/:id', deleteUserAdmin);

UserRouter.patch(
    '/user/admin/:id',
    uploadUser.single('adminOwnerFile'),
    updateUserAdmin
);

export default UserRouter;
