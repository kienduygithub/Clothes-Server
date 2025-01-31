import HttpErrors from "../../common/errors/http-errors";
import { ResponseModel } from "../../common/errors/response";
import { handleDeleteImageAsFailed, handleDeleteImages } from "../../common/middleware/upload.middleware";
import { hashPassword } from "../../common/utils/user.common";
import { User } from "../models";

const fetchAllUser = async () => {
    try {
        const users = await User.findAll({
            where: {
                roles: ['Admin', 'Customer']
            }
        });
        const payload = {
            users: users
        };
        return ResponseModel.success('Danh sách người dùng', payload);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

const fetchUserById = async (userId) => {
    try {
        if (!userId) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu trường cần thiết', null);
        }

        const user = await User.findOne({
            where: { id: userId }
        });

        if (!user) {
            ResponseModel.error(HttpErrors.NOT_FOUND, 'Người dùng không tồn tại', null);
        }

        const payload = {
            user: user
        };
        return ResponseModel.success('Chi tiết người dùng.', payload);
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

// Admin tạo người dùng để quản lý shop
const createUserAdmin = async (info, file) => {
    try {
        if (!info || !file) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu trường cần thiết', {
                info,
                file
            });
        }
        const {
            name,
            email,
            password,
            phone,
            gender,
            address,
            roles,
            shopId
        } = JSON.parse(info);

        if (!name || !email || !password || !roles) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu trường cần thiết', {
                name, email, password, roles
            })
        }

        const existEmail = await User.findOne({
            where: { email: email }
        });

        if (existEmail) {
            ResponseModel.error(HttpErrors.CONFLICT, 'Người dùng đã tồn tại', { email })
        }

        await User.create({
            name: name,
            email: email,
            password: hashPassword(password),
            phone: phone,
            gender: gender,
            address: address,
            image_url: `admin-owners/${file.filename}`,
            shopId: shopId === null || shopId === undefined ? null : shopId,
            roles: roles
        });

        return ResponseModel.success('Tạo người dùng thành công', null);
    } catch (error) {
        handleDeleteImageAsFailed(file);
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

// Admin xóa người dùng quản lý shop
const deleteUserAdmin = async (userId) => {
    try {
        if (!userId) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu trường cần thiết', {
                userId: userId
            });
        }

        const existUser = await User.findOne({
            where: { id: userId }
        });

        if (!existUser) {
            ResponseModel.error(HttpErrors.NOT_FOUND, 'Người dùng không tồn tại', null);
        }

        await User.destroy({
            where: { id: userId }
        });

        const image_url = existUser.image_url;
        if (image_url !== null) {
            await handleDeleteImages([image_url]);
        }

        return ResponseModel.success('Xóa người dùng thành công', null);
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

module.exports = {
    fetchAllUser: fetchAllUser,
    fetchUserById: fetchUserById,
    createUserAdmin: createUserAdmin,
    deleteUserAdmin: deleteUserAdmin
}

