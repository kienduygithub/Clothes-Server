import { Op } from "sequelize";
import HttpErrors from "../../common/errors/http-errors";
import { ResponseModel } from "../../common/errors/response";
import { User } from "../models";
import { comparePassword, hashPassword } from "../../common/utils/user.common";
import { generalAccessToken, generalRefreshToken } from "../../common/middleware/jwt.middleware";
import { handleDeleteImageAsFailed } from "../../common/middleware/upload.middleware";
import { sendActivateStoreMailer } from "../../common/mails/mailer.config";

export const signIn = async (info) => {
    try {
        const { email, password } = info;
        if (!email || !password) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', null);
        }


        const existUser = await User.findOne({
            where: {
                email: email,
                [Op.or]: [{ roles: 'Admin' }, { roles: 'Owner' }]
            }
        });

        if (!existUser) {
            ResponseModel.error(HttpErrors.NOT_FOUND, 'Tên đăng nhập hoặc mật khẩu không chính xác.', null);
        }

        const compared = comparePassword(password, existUser.password);

        if (!compared) {
            ResponseModel.error(HttpErrors.NOT_FOUND, 'Tên đăng nhập hoặc mật khẩu không chính xác.', null);
        }

        const payload = {
            id: existUser.id,
            name: existUser.name,
            image_url: existUser.image_url !== null ? existUser.image_url : '',
            roles: existUser.roles,
            shopId: existUser?.shopId || 0
        };

        const access_token = generalAccessToken(payload);
        const refresh_token = generalRefreshToken(payload);

        const loginInfo = {
            info: payload,
            access_token: access_token,
            refresh_token: refresh_token
        }

        return ResponseModel.success('Đăng nhập thành công', loginInfo);
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const signUp = async (
    userInfo,
    shopInfo,
    files
) => {
    try {
        // if (!info || !files) {
        //     ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', null);
        // }

        // const {
        //     name,
        //     email,
        //     password,
        //     address,
        //     phone,
        //     gender
        // } = JSON.parse(info);

        // if (!email || !password) {
        //     ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', null);
        // }

        // const existEmail = await User.findOne({
        //     where: { email: email }
        // });

        // if (existEmail) {
        //     ResponseModel.error(HttpErrors.NOT_FOUND, 'Tài khoản đã tồn tại', null);
        // }

        // const hash = hashPassword(password);
        // const user = await User.create({
        //     name: name,
        //     email: email,
        //     password: hash,
        //     address: address,
        //     phone: phone,
        //     gender: gender,
        //     image_url: files['adminOwnerFile'] ? `admin-owners/${files['adminOwnerFile'][0]?.filename}` : '',
        //     roles: 'Owner'
        // });

        // return ResponseModel.success('Tạo tài khoản thành công', { user });
        sendActivateStoreMailer(
            "buikienduy2020@gmail.com",
            "Kiến Duy",
            "Cửa hàng thời trang",
        );
        return ResponseModel.success('Tạo tài khoản thành công', {
            // user: JSON.parse(userInfo),
            // shop: JSON.parse(shopInfo)
        });
    } catch (error) {
        if (files?.length) {
            await Promise.all(files.map(file => handleDeleteImageAsFailed(file)));
        }
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const signInMobile = async (info) => {
    try {

    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const signUpMobile = async (info) => {
    try {

    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const fetchDetailUser = async (userId) => {
    try {
        if (!userId) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', null);
        }

        const existUser = await User.findOne({
            where: {
                id: userId,
                [Op.or]: [{ roles: 'Admin' }, { roles: 'Owner' }]
            },
            attributes: {
                exclude: ['createdAt', 'updatedAt', 'password']
            }
        });

        if (!existUser) {
            ResponseModel.error(HttpErrors.NOT_FOUND, 'Người dùng không tồn tại', null);
        }

        existUser.shopId = existUser?.shopId === null ? 0 : existUser.shopId;
        existUser.image_url = existUser?.image_url === null ? '' : existUser.image_url;

        const payload = {
            users: [existUser]
        }

        return ResponseModel.success('Chi tiết người dùng', payload);
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}