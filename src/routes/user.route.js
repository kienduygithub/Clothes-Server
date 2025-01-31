import express from 'express';
import {
    uploadUser
} from '../common/middleware/upload.middleware';
import {
    fetchAllUser,
    fetchUserById,
    createUserAdmin,
    deleteUserAdmin
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

export default UserRouter;
