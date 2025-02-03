import HttpErrors from "../../common/errors/http-errors";
import { ResponseModel } from "../../common/errors/response";
import { handleDeleteImageAsFailed, handleDeleteImages } from "../../common/middleware/upload.middleware";
import { hashPassword } from "../../common/utils/user.common";
import { User } from "../models";

export const fetchAllUser = async () => {
    try {
        const users = await User.findAll({
            where: {
                roles: ['Admin', 'Owner']
            },
        });

        const dtoUsers = users.map(user => ({
            ...user.dataValues,
            shopId: user.dataValues.shopId === null ? 0 : user.dataValues.shopId
        }));

        const payload = {
            users: dtoUsers
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

export const fetchUserById = async (userId) => {
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

        user.image_url = user.image_url === null ? '' : user.image_url;
        user.shopId = user.shopId === null ? 0 : user.shopId;

        const payload = {
            users: [user]
        };
        return ResponseModel.success('Chi tiết người dùng.', payload);
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

// Admin tạo người dùng để quản lý shop
export const createUserAdmin = async (info, file) => {
    try {
        if (!info) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu trường cần thiết', {
                info,
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
export const deleteUserAdmin = async (userId) => {
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

// Admin cập nhật người dùng quản lý shop
export const updateUserAdmin = async (userId, info, file) => {
    try {
        if (!info || !userId) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu trường cần thiết', {
                info: info,
                file: file,
                userId: userId
            });
        }

        const {
            name,
            email,
            phone,
            gender,
            address,
            roles,
            shopId
        } = JSON.parse(info);

        if (!email || !phone) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu trường cần thiết', {
                email: email,
                phone: phone
            });
        }

        const user = await User.findOne({
            where: { id: userId }
        });

        if (!user) {
            ResponseModel.error(HttpErrors.NOT_FOUND, 'Người dùng không tồn tại.', null);
        }

        if (name) {
            user.name = name;
        }
        if (shopId) {
            user.shopId = shopId;
        }
        if (file) {
            user.image_url = `admin-owners/${file.filename}`;
        }
        user.email = email;
        user.phone = phone;
        user.gender = gender;
        user.address = address;
        user.roles = roles;

        await user.save();

        return ResponseModel.success('Cập nhật người dùng thành công', null);
    } catch (error) {
        handleDeleteImageAsFailed(file);
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

