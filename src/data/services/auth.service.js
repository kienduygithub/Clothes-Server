import { Op } from "sequelize";
import HttpErrors from "../../common/errors/http-errors";
import { ResponseModel } from "../../common/errors/response";
import { User, Shop } from "../models";
import { comparePassword, hashPassword } from "../../common/utils/user.common";
import { generalAccessToken, generalRefreshToken } from "../../common/middleware/jwt.middleware";
import { handleDeleteImageAsFailed } from "../../common/middleware/upload.middleware";
import { sendActivateStoreMailer } from "../../common/mails/mailer.config";
import { ShopStatus } from "../../common/utils/status";
import { UserRoles } from "../../common/utils/roles";

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
            },
            include: [{
                model: Shop,
                as: 'shop',
                attributes: ['id', 'shop_name', 'status']
            }]
        });

        if (!existUser) {
            ResponseModel.error(HttpErrors.NOT_FOUND, 'Tên đăng nhập hoặc mật khẩu không chính xác.', null);
        }

        const compared = comparePassword(password, existUser.password);

        if (!compared) {
            ResponseModel.error(HttpErrors.NOT_FOUND, 'Tên đăng nhập hoặc mật khẩu không chính xác.', null);
        }

        const roles = existUser.roles;
        const shopStatus = existUser.shop?.status ?? '';

        if (roles === UserRoles.OWNER && shopStatus === ShopStatus.PENDING) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Tài khoản chủ shop chưa được xét duyệt');
        }

        const payload = {
            id: existUser.id,
            name: existUser.name,
            image_url: existUser.image_url !== null ? existUser.image_url : '',
            roles: existUser.roles,
            shopId: existUser?.shopId || 0,
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
        if (!userInfo || !shopInfo || !files) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', null);
        }

        const {
            name,
            email,
            password,
            address,
            phone,
            gender
        } = JSON.parse(userInfo);

        if (!email || !password) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', null);
        }

        const existEmail = await User.findOne({
            where: { email: email }
        });

        if (existEmail) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Tài khoản đã tồn tại', null);
        }

        // Bước 1: Tạo cửa hàng
        const {
            shop_name,
            contact_email,
            contact_address,
            description
        } = JSON.parse(shopInfo);

        if (!shop_name || !contact_email || !contact_address) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu trường cần thiết', {
                shop_name: shop_name ?? '',
                contact_email: contact_email ?? '',
                contact_address: contact_address ?? ''
            });
        }

        const shop = await Shop.create({
            shop_name: shop_name,
            logo_url: files && files['logoShopFile']
                ? `shops/${files['logoShopFile'][0].filename}`
                : '',
            background_url: files && files['backgroundShopFile']
                ? `shop-backgrounds/${files['backgroundShopFile'][0].filename}`
                : '',
            contact_email: contact_email ?? '',
            contact_address: contact_address ?? '',
            description: description ?? '',
            status: ShopStatus.PENDING,
        });

        // Bước 2: Tạo người dùng
        const hash = hashPassword(password);
        const user = await User.create({
            name: name,
            email: email,
            password: hash,
            address: address,
            phone: phone,
            gender: gender,
            image_url: files['adminOwnerFile'] ? `admin-owners/${files['adminOwnerFile'][0]?.filename}` : '',
            roles: 'Owner',
            shopId: shop.id
        });

        return ResponseModel.success('Đăng ký chủ cửa hàng thành công', {
            user: user,
            shop: shop
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