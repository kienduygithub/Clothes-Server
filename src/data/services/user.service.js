import HttpErrors from "../../common/errors/http-errors";
import { ResponseModel } from "../../common/errors/response";
import { handleDeleteImageAsFailed, handleDeleteImages } from "../../common/middleware/upload.middleware";
import { hashPassword } from "../../common/utils/user.common";
import db, { sequelize, User } from "../models";

export const fetchAllUser = async () => {
    try {
        const users = await User.findAll({
            where: {
                roles: ['Owner']
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
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', null);
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
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
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
        } = JSON.parse(info);

        if (!name || !email || !password || !roles) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
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
            image_url: file ? `admin-owners/${file.filename}` : null,
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
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
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
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
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
        } = JSON.parse(info);

        if (!email || !phone) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
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
        if (file) {
            user.image_url = `admin-owners/${file.filename}`;
        }
        user.email = email;
        user.phone = phone;
        user.gender = gender;
        user.address = address;
        user.roles = roles;

        await user.save();

        return ResponseModel.success('Cập nhật người dùng thành công', {});
    } catch (error) {
        handleDeleteImageAsFailed(file);
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}


/** MOBILE */
export const fetchUserInfo = async (user_id) => {
    try {
        if (!user_id) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                user_id: user_id ?? ''
            });
        }

        const user = await User.findOne({
            where: { id: user_id },
            attributes: ['id', 'name', 'email', 'phone', 'gender', 'address', 'image_url', 'roles'],
            include: {
                model: db.Cart,
                as: 'cart',
                attributes: ['id']
            }
        });

        if (!user) {
            ResponseModel.error(HttpErrors.NOT_FOUND, 'Người dùng không tồn tại.', null);
        }

        return ResponseModel.success('Thông tin người dùng', {
            users: [user]
        });
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const editUserInfo = async (user_id, userInfo) => {
    const t = await sequelize.transaction();
    try {
        if (!userInfo || !user_id) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                userInfo: userInfo ?? {},
                user_id: user_id ?? ''
            });
        }

        const {
            name,
            phone,
            gender,
            address,
        } = userInfo;

        const user = await User.findOne({
            where: { id: user_id },
            transaction: t
        });

        if (!user) {
            ResponseModel.error(HttpErrors.NOT_FOUND, 'Người dùng không tồn tại.', null);
        }

        if (name) {
            user.name = name;
        }

        if (phone) {
            user.phone = phone;
        }

        if (gender) {
            user.gender = gender;
        }

        if (address) {
            user.address = address;
        }

        await user.save();

        await t.commit();

        return ResponseModel.success('Cập nhật người dùng thành công', {});
    } catch (error) {
        await t.rollback();
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const editAvatarUser = async (user_id, file) => {
    const t = await sequelize.transaction();
    try {
        if (!file || !user_id) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                file: file ?? {},
                user_id: user_id ?? ''
            });
        }

        const user = await User.findOne({
            where: { id: user_id },
            transaction: t
        });

        if (!user) {
            ResponseModel.error(HttpErrors.NOT_FOUND, 'Người dùng không tồn tại.', null);
        }

        let deleteImage = user.image_url || '';

        user.image_url = `users/${file.filename}`

        await user.save();

        await t.commit();

        await handleDeleteImages([deleteImage]);

        return ResponseModel.success('Cập nhật ảnh đại diện thành công', {
            url: `users/${file.filename}`
        });
    } catch (error) {
        await t.rollback();
        await handleDeleteImageAsFailed(file);
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
} 