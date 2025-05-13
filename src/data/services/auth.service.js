import { Op } from "sequelize";
import HttpErrors from "../../common/errors/http-errors";
import { ResponseModel } from "../../common/errors/response";
import db, { User, Shop, Cart, sequelize } from "../models";
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
                [Op.or]: [{ roles: UserRoles.ADMIN }, { roles: UserRoles.OWNER }]
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
    files,
    userId = null
) => {
    const transaction = await sequelize.transaction();

    try {
        if (!userInfo || !shopInfo || !files) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {

            });
        }

        let user;

        if (userId) {
            user = await db.User.findOne({
                where: { id: userId },
                transaction
            });

            if (!user) {
                ResponseModel.error(HttpErrors.NOT_FOUND, 'Người dùng không tồn tại', {});
            }

            if (user.roles === UserRoles.OWNER || user.shopId) {
                ResponseModel.error(HttpErrors.BAD_REQUEST, 'Người dùng đã là chủ cửa hàng', {});
            }
        } else {
            // Trường hợp tạo tài khoản mới
            if (!userInfo) {
                return ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin người dùng', null);
            }
            const { name, email, password, address, phone, gender } = JSON.parse(userInfo);
            if (!email || !password) {
                ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu email hoặc mật khẩu', null);
            }

            const existEmail = await db.User.findOne({ where: { email }, transaction });
            if (existEmail) {
                ResponseModel.error(HttpErrors.BAD_REQUEST, 'Tài khoản đã tồn tại', {});
            }

            const hash = hashPassword(password);
            user = await db.User.create({
                name,
                email,
                password: hash,
                address,
                phone,
                gender,
                image_url: files['adminOwnerFile'] ? `admin-owners/${files['adminOwnerFile'][0]?.filename}` : '',
                roles: UserRoles.OWNER
            }, { transaction });
        }

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
        }, { transaction });

        await user.update({ shopId: shop.id, roles: UserRoles.OWNER }, { transaction });

        await transaction.commit();

        return ResponseModel.success('Đăng ký chủ cửa hàng thành công', {
            user: user,
            shop: shop
        });
    } catch (error) {
        await transaction.rollback();
        if (files?.length) {
            await Promise.all(files.map(file => handleDeleteImageAsFailed(file)));
        }
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const changePassword = async (user_id, data) => {
    const transaction = await sequelize.transaction();
    try {
        const { currentPassword, newPassword } = data;
        if (!user_id || !currentPassword || !newPassword) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                user_id: user_id ?? '',
                currentPassword: currentPassword ?? '',
                newPassword: newPassword ?? ''
            });
        }

        let user = await db.User.findOne({
            where: { id: user_id },
            attributes: ['id', 'password'],
            transaction
        });

        if (!user) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Người dùng không tồn tại', {});
        }

        const matchPassword = comparePassword(currentPassword, user.password);

        if (!matchPassword) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Mật khẩu không đúng', {});
        }

        const hashedPassword = hashPassword(newPassword);

        user.password = hashedPassword;

        await user.save();

        await transaction.commit();

        return ResponseModel.success('Đổi mật khẩu thành công', true);
    } catch (error) {
        await transaction.rollback();
        console.log(error);
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const signInMobile = async (info) => {
    try {
        const { email, password } = info;
        if (!email || !password) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                email: email ?? '',
                password: password ?? ''
            });
        }

        const user = await User.findOne({
            where: {
                [Op.or]: [{ roles: UserRoles.CUSTOMER }, { roles: UserRoles.OWNER }],
                email: email
            },
            include: {
                model: Cart,
                as: 'cart',
                attributes: ['id']
            }
        });

        if (!user) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Người dùng không tồn tại', {});
        }

        const compared = comparePassword(password, user.password);

        if (!compared) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thông tin đăng nhập không chính xác', {});
        }

        const payload = {
            id: user.id,
            email: user.email,
            name: user.name,
            image_url: user.image_url !== null ? user.image_url : '',
            cart_id: user?.cart?.id ?? 0,
            roles: user.roles,
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

export const signUpMobile = async (info, file) => {
    const t = await sequelize.transaction();
    try {
        if (!info || !file) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                info: info ?? {},
                file: file ?? ''
            });
        }

        const {
            name,
            email,
            password,
            gender,
            phone,
            address
        } = JSON.parse(info);

        if (!name || !email || !password) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                name: name ?? '',
                email: email ?? '',
                password: password ?? '',
            });
        }

        const existUser = await User.findOne({
            where: {
                email: email,
                [Op.or]: [{ roles: UserRoles.ADMIN }, { roles: UserRoles.CUSTOMER }]
            },
            transaction: t
        });

        if (existUser) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Người dùng đã tồn tại', {});
        }

        const user = await User.create({
            name: name,
            email: email,
            password: hashPassword(password),
            gender: gender,
            phone: phone ?? '',
            address: address ?? '',
            image_url: file ? `users/${file.filename}` : '',
            roles: UserRoles.CUSTOMER
        }, { transaction: t });

        await Cart.create({
            user_id: user.id
        }, { transaction: t });

        await t.commit();

        return ResponseModel.success('Tạo tài khoản thành công', {});
    } catch (error) {
        await t.rollback();
        await handleDeleteImageAsFailed(file);
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

export const registerShopMobile = async (
    userInfo,
    shopInfo,
    files
) => {
    const transaction = await sequelize.transaction();

    try {
        if (!userInfo || !shopInfo || !files) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', null);
        }

        const {
            id,
            roles
        } = JSON.parse(userInfo);

        if (!id || !roles) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin người dùng', {
                id: id ?? '',
                roles: roles ?? ''
            });
        }

        if (roles === UserRoles.OWNER) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Người dùng đã sở hữu hoặc quản lý cửa hàng', {});
        }

        const user = await User.findOne({
            where: { id: id }
        });

        if (!user) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Tài khoản không tồn tại', {});
        }

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
        }, { transaction });

        await User.update(
            {
                roles: UserRoles.OWNER,
                shopId: shop.id
            },
            {
                where: { id: id },
                transaction
            }
        );

        await transaction.commit();

        return ResponseModel.success('Đăng ký chủ cửa hàng thành công', {});
    } catch (error) {
        await transaction.rollback();
        if (files?.length) {
            await Promise.all(files.map(file => handleDeleteImageAsFailed(file)));
        }
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const checkUserForShopRegistration = async ({ email, password }) => {
    try {
        if (!email || !password) {
            return ResponseModel.error(HttpErrors.BAD_REQUEST, 'Vui lòng cung cấp email và mật khẩu');
        }

        const user = await User.findOne({
            where: { email: email },
            attributes: ['id', 'email', 'password', 'image_url', 'address', 'name', 'roles', 'shopId']
        });

        if (!user || user === null) {
            return ResponseModel.success('Email chưa được đăng ký, có thể tạo tài khoản mới để đăng ký cửa hàng', {
                canRegister: true,
                isNewUser: true
            });
        }

        const isPasswordValid = comparePassword(password, user.password);
        if (!isPasswordValid) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thông tin đăng ký không hợp lệ.', {});
        }

        if (user.roles === UserRoles.OWNER || user.shopId) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Người dùng đã là chủ cửa hàng hoặc đã liên kết với một cửa hàng', {});
        }

        return ResponseModel.success('Người dùng có thể đăng ký cửa hàng', {
            canRegister: true,
            isNewUser: false,
            users: [user]
        });
    } catch (error) {
        return ResponseModel.error(error?.status || 500, error?.message || 'Lỗi khi kiểm tra người dùng', error?.body);
    }
};