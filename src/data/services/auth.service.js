import { Op } from "sequelize";
import HttpErrors from "../../common/errors/http-errors";
import { ResponseModel } from "../../common/errors/response";
import db, { User, Shop, Cart, sequelize, Sequelize } from "../models";
import { comparePassword, hashPassword } from "../../common/utils/user.common";
import { generalAccessToken, generalRefreshToken } from "../../common/middleware/jwt.middleware";
import { handleDeleteImageAsFailed, handleDeleteImages } from "../../common/middleware/upload.middleware";
import { sendActivateStoreMailer } from "../../common/mails/mailer.config";
import { NotificationActionType, NotificationReferenceType, NotificationType, OrderStatus, ShopStatus } from "../../common/utils/status";
import { UserRoles } from "../../common/utils/roles";
import { pushNotificationUser } from "../../common/utils/socket.service";

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
            ResponseModel.error(HttpErrors.NOT_FOUND, 'Thông tin đăng nhập không hợp lệ', {});
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
) => {
    const transaction = await sequelize.transaction();
    try {
        if (!userInfo || !shopInfo || !files) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {});
        }

        let {
            id,
            name: shopOwnerName
        } = JSON.parse(userInfo);

        let user = await db.User.findByPk(id, { transaction });

        if (!user) {
            ResponseModel.error(HttpErrors.NOT_FOUND, 'Người dùng không tồn tại', {});
        }

        if (user.roles === UserRoles.OWNER || user.shopId) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Người dùng không được phép đăng ký cửa hàng.', {});
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
        console.log(error);
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

        const admins = await User.findAll({
            where: { roles: UserRoles.ADMIN }
        });

        for (const admin of admins) {
            const adminNotification = await db.Notification.create({
                user_id: admin.id,
                roles: UserRoles.ADMIN,
                type: NotificationType.STORE_REGISTRATION_REQUEST,
                reference_id: shop.id,
                reference_type: NotificationReferenceType.STORE_REGISTRATION,
                data: {
                    owner_id: id,
                    shop_name: shop.shop_name,
                },
                action: NotificationActionType.VIEW_REGISTRATION,
                is_read: false,
                created_at: new Date(),
            }, { transaction });

            const notificationPayload = {
                type: 'notification',
                notification: {
                    id: adminNotification.id,
                    user_id: adminNotification.user_id,
                    roles: adminNotification.roles,
                    type: adminNotification.type,
                    reference_id: adminNotification.reference_id,
                    reference_type: adminNotification.reference_type,
                    data: adminNotification.data,
                    action: adminNotification.action,
                    is_read: adminNotification.is_read,
                    created_at: adminNotification.createdAt
                }
            };

            pushNotificationUser(admin.id, notificationPayload);
        }

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
            attributes: [
                'id', 'email', 'password', 'image_url',
                'address', 'name', 'roles', 'shopId',
                'gender', 'phone'
            ]
        });

        if (!user || user === null) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Người dùng không tồn tại');
        }

        const isPasswordValid = comparePassword(password, user.password);
        if (!isPasswordValid) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thông tin đăng ký không hợp lệ.', {});
        }

        if (user.roles === UserRoles.OWNER || user.shopId) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Người dùng không được phép đăng ký', {});
        }

        return ResponseModel.success('Người dùng có thể đăng ký cửa hàng', {
            users: [user]
        });
    } catch (error) {
        console.log(error);
        return ResponseModel.error(error?.status || 500, error?.message || 'Lỗi khi kiểm tra người dùng', error?.body);
    }
};

export const editAccountDetails = async (user_id, info, file) => {
    const t = await sequelize.transaction();
    try {
        if (!info) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                info: info ?? {},
                file: file ?? ''
            });
        }

        const {
            name,
            gender,
            phone,
        } = JSON.parse(info);

        if (!name) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                name: name ?? '',
            });
        }

        const existUser = await User.findOne({
            where: { id: user_id },
            transaction: t
        });

        if (!existUser) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Người dùng không tồn tại', {});
        }

        existUser.name = name?.trim();
        existUser.phone = phone?.trim();
        existUser.gender = parseInt(gender);

        let image_url;
        if (file) {
            image_url = existUser.image_url;
            existUser.image_url = `admin-owners/${file?.filename}`;
        }

        await existUser.save({ transaction: t });

        await t.commit();

        if (image_url) {
            await handleDeleteImages([image_url]);
        }

        return ResponseModel.success('Chỉnh sửa thông tin thành công', {
            image_url: existUser.image_url
        });
    } catch (error) {
        await t.rollback();
        await handleDeleteImageAsFailed(file);
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}
/** Thống kê các cửa hàng mới **/
// => Theo năm (12 tháng)
export const fetchNewShopsStats = async ({ dateRanges, groupBy = 'day' }) => {
    try {
        // Kiểm tra dateRanges
        if (!dateRanges || !Array.isArray(dateRanges) || !['day', 'month'].includes(groupBy)) {
            throw ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu hoặc sai định dạng dateRanges/groupBy', {
                dateRanges,
                groupBy
            });
        }

        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
        const currentDay = currentDate.getDate();

        const groupByExpression = {
            day: Sequelize.fn('DATE', Sequelize.col('statusChangedAt')),
            month: Sequelize.fn('DATE_FORMAT', Sequelize.col('statusChangedAt'), '%Y-%m')
        }[groupBy];

        const groupByAlias = groupByExpression;

        // Thống kê cho từng tháng trong dateRanges
        const monthlyStats = await Promise.all(dateRanges.map(async (range) => {
            const { startDate, endDate, month } = range;

            // Kiểm tra startDate và endDate hợp lệ
            const start = new Date(startDate);
            const end = new Date(endDate);
            if (isNaN(start) || isNaN(end) || start > end) {
                ResponseModel.error(HttpErrors.BAD_REQUEST, 'startDate hoặc endDate không hợp lệ');
            }

            // Nếu month không null, kiểm tra là số từ 1-12
            if (month && month !== null && (typeof month !== 'number' || month < 1 || month > 12)) {
                ResponseModel.error(HttpErrors.BAD_REQUEST, 'Month phải là số từ 1 đến 12 hoặc null');
            }

            // Lấy rangeYear và rangeMonth để kiểm tra tương lai
            const rangeYear = start.getFullYear();
            const rangeMonth = start.getMonth() + 1;

            // Định dạng month cho output (chuỗi "01" đến "12")
            const outputMonth = month !== null ? String(month).padStart(2, '0') : String(rangeMonth).padStart(2, '0');

            // Nếu khoảng thời gian nằm hoàn toàn trong tương lai, trả về rỗng
            if (rangeYear > currentYear || (rangeYear === currentYear && rangeMonth > currentMonth)) {
                return {
                    month: outputMonth,
                    startDate,
                    endDate,
                    newShops: [],
                    totalNewShops: 0,
                    periods: []
                };
            }

            let periods = [];
            let newShops = [];

            if (groupBy === 'day') {
                // Truy vấn cửa hàng mới theo ngày
                const shopData = await db.Shop.findAll({
                    where: {
                        status: ShopStatus.ACTIVE,
                        statusChangedAt: {
                            [Op.between]: [startDate, endDate]
                        }
                    },
                    attributes: [
                        [groupByExpression, 'period'],
                        'id',
                        'shop_name',
                        'statusChangedAt'
                    ],
                    group: [groupByAlias, 'id', 'shop_name', 'statusChangedAt'],
                    order: [[Sequelize.col('period'), 'ASC']],
                    raw: true
                });

                // Chuyển đổi dữ liệu thành map
                const shopMap = new Map();
                shopData.forEach(item => {
                    if (!shopMap.has(item.period)) {
                        shopMap.set(item.period, []);
                    }
                    shopMap.get(item.period).push({
                        id: item.id,
                        shop_name: item.shop_name,
                        statusChangedAt: item.statusChangedAt
                    });
                });

                // Tạo danh sách đầy đủ các ngày
                for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                    const day = d.getDate();
                    const period = d.toISOString().split('T')[0]; // YYYY-MM-DD

                    // Ngày tương lai trả về 0
                    if (rangeYear === currentYear && rangeMonth === currentMonth && day > currentDay) {
                        periods.push({
                            period,
                            totalNewShops: 0,
                            newShops: []
                        });
                        continue;
                    }

                    const dailyShops = shopMap.get(period) || [];
                    periods.push({
                        period,
                        totalNewShops: dailyShops.length,
                        newShops: dailyShops
                    });
                }

                newShops = periods.flatMap(period => period.newShops);
            } else if (groupBy === 'month') {
                // Truy vấn cửa hàng mới theo tháng
                const shopData = await db.Shop.findAll({
                    where: {
                        status: ShopStatus.ACTIVE,
                        statusChangedAt: {
                            [Op.between]: [startDate, endDate]
                        }
                    },
                    attributes: [
                        [groupByExpression, 'period'],
                        'id',
                        'shop_name',
                        'statusChangedAt'
                    ],
                    group: [groupByAlias, 'id', 'shop_name', 'statusChangedAt'],
                    order: [[Sequelize.col('period'), 'ASC']],
                    raw: true
                });

                const period = `${rangeYear}-${outputMonth}`;
                const periodShops = shopData.filter(item => item.period === period).map(item => ({
                    id: item.id,
                    shop_name: item.shop_name,
                    statusChangedAt: item.statusChangedAt
                }));

                periods = [{
                    period,
                    totalNewShops: periodShops.length,
                    newShops: periodShops
                }];

                newShops = periodShops;
            }

            return {
                month: outputMonth,
                startDate,
                endDate,
                newShops,
                totalNewShops: periods.reduce((sum, period) => sum + period.totalNewShops, 0),
                periods
            };
        }));

        // Tổng hợp (chỉ tính các tháng hợp lệ)
        const overview = {
            newShops: monthlyStats.flatMap(stat => stat.newShops),
            totalNewShops: monthlyStats
                .filter(stat => {
                    const statDate = new Date(stat.startDate);
                    const statYear = statDate.getFullYear();
                    const statMonth = statDate.getMonth() + 1;
                    return statYear < currentYear || (statYear === currentYear && statMonth <= currentMonth);
                })
                .reduce((sum, stat) => sum + stat.totalNewShops, 0),
            periods: monthlyStats.flatMap(stat => stat.periods)
        };

        return ResponseModel.success('Thống kê cửa hàng mới', {
            monthlyStats,
            overview
        });
    } catch (error) {
        return ResponseModel.error(error?.status || 500, error?.message || 'Lỗi server');
    }
};
// => Theo năm (12 tháng)
export const fetchInactiveShopsStats = async ({ dateRanges, groupBy = 'day' }) => {
    try {
        // Kiểm tra dateRanges
        if (!dateRanges || !Array.isArray(dateRanges) || !['day', 'month'].includes(groupBy)) {
            throw ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu hoặc sai định dạng dateRanges/groupBy', {
                dateRanges,
                groupBy
            });
        }

        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;

        // Thống kê cho từng tháng trong dateRanges
        const monthlyStats = await Promise.all(dateRanges.map(async (range) => {
            const { startDate, endDate, month } = range;

            // Kiểm tra tháng có hợp lệ không (không vượt quá tháng hiện tại)
            const rangeDate = new Date(startDate);
            const rangeYear = rangeDate.getFullYear();
            const rangeMonth = rangeDate.getMonth() + 1;

            // Nếu tháng trong tương lai, trả về kết quả rỗng
            if (rangeYear > currentYear || (rangeYear === currentYear && rangeMonth > currentMonth)) {
                return {
                    month: month || null,
                    startDate,
                    endDate,
                    totalInactiveShops: 0,
                    inactiveShops: []
                };
            }

            // Lấy các cửa hàng không hoạt động cho tháng hợp lệ
            const inactiveShops = await db.Shop.findAll({
                where: {
                    status: 'inactive',
                    statusChangedAt: {
                        [Op.between]: [startDate, endDate]
                    }
                },
                attributes: ['id', 'shop_name', 'statusChangedAt'],
                raw: true
            });

            return {
                month: month || null,
                startDate,
                endDate,
                totalInactiveShops: inactiveShops.length,
                inactiveShops: inactiveShops.map(shop => ({
                    id: shop.id,
                    shop_name: shop.shop_name,
                    statusChangedAt: shop.statusChangedAt
                }))
            };
        }));

        // Tổng hợp (chỉ tính các tháng hợp lệ)
        const overview = {
            totalInactiveShops: monthlyStats
                .filter(stat => {
                    const statDate = new Date(stat.startDate);
                    const statYear = statDate.getFullYear();
                    const statMonth = statDate.getMonth() + 1;
                    return statYear < currentYear || (statYear === currentYear && statMonth <= currentMonth);
                })
                .reduce((sum, stat) => sum + stat.totalInactiveShops, 0),
            inactiveShops: monthlyStats.flatMap(stat => stat.inactiveShops)
        };

        return ResponseModel.success('Thống kê cửa hàng không hoạt động', { monthlyStats, overview });
    } catch (error) {
        return ResponseModel.error(error?.status || 500, error?.message || 'Lỗi server');
    }
};
// => Theo tháng/năm
export const fetchOrderActivityStats = async ({ dateRanges, groupBy = 'day' }) => {
    try {
        // Kiểm tra đầu vào
        if (!dateRanges || !Array.isArray(dateRanges) || !['day', 'week', 'month'].includes(groupBy)) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu hoặc sai định dạng dateRanges/groupBy', {
                dateRanges,
                groupBy
            });
        }

        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        const currentDay = currentDate.getDate();

        // Xác định biểu thức groupBy
        const groupByExpression = {
            day: Sequelize.fn('DATE', Sequelize.col('OrderShop.createdAt')),
            week: Sequelize.fn('DATE_FORMAT', Sequelize.col('OrderShop.createdAt'), '%Y-%u'),
            month: Sequelize.fn('DATE_FORMAT', Sequelize.col('OrderShop.createdAt'), '%Y-%m')
        }[groupBy];

        const groupByAlias = groupByExpression;

        // Thống kê cho từng tháng trong dateRanges
        const monthlyStats = await Promise.all(dateRanges.map(async (range) => {
            const { startDate, endDate, month } = range;

            // Kiểm tra tháng hợp lệ
            const rangeDate = new Date(startDate);
            const rangeYear = rangeDate.getFullYear();
            const rangeMonth = rangeDate.getMonth() + 1;
            if (rangeYear > currentYear || (rangeYear === currentYear && rangeMonth > currentMonth)) {
                return {
                    month: month || null,
                    startDate,
                    endDate,
                    orders: [],
                    totalOrders: 0,
                    statusCounts: { pending: 0, paid: 0, processing: 0, shipped: 0, completed: 0, canceled: 0 }
                };
            }

            // Truy vấn đơn hàng
            const orderData = await db.OrderShop.findAll({
                where: {
                    createdAt: { [Op.between]: [startDate, endDate] }
                },
                attributes: [
                    [groupByExpression, 'period'],
                    ['status', 'status'],
                    [Sequelize.fn('COUNT', Sequelize.col('OrderShop.id')), 'count']
                ],
                group: [groupByAlias, 'OrderShop.status'],
                order: [[Sequelize.col('period'), 'ASC']],
                raw: true
            });

            // Chuyển đổi dữ liệu thành map
            const orderMap = new Map(orderData.map(item => [`${item.period}:${item.status}`, parseInt(item.count || 0)]));

            // Định dạng dữ liệu
            const formattedData = [];
            const statusList = [
                OrderStatus.PENDING,
                OrderStatus.PAID,
                OrderStatus.PROCESSING,
                OrderStatus.SHIPPED,
                OrderStatus.COMPLETED,
                OrderStatus.CANCELED
            ];
            const start = new Date(startDate);
            const end = new Date(endDate);

            if (groupBy === 'day') {
                // Lặp qua tất cả ngày trong tháng
                for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                    const period = d.toISOString().split('T')[0]; // Định dạng YYYY-MM-DD
                    const day = d.getDate();
                    // Ngày tương lai trả về 0
                    if (rangeYear === currentYear && rangeMonth === currentMonth && day > currentDay) {
                        formattedData.push({
                            period,
                            counts: { pending: 0, paid: 0, processing: 0, shipped: 0, completed: 0, canceled: 0 }
                        });
                        continue;
                    }

                    const counts = {};
                    statusList.forEach(status => {
                        const key = `${period}:${status}`;
                        counts[status] = orderMap.get(key) || 0;
                    });
                    formattedData.push({
                        period,
                        counts
                    });
                }
            } else if (groupBy === 'month') {
                const year = new Date(startDate).getFullYear();
                const expectedPeriod = `${year}-${month.toString().padStart(2, '0')}`;
                const counts = {};
                statusList.forEach(status => {
                    const key = `${expectedPeriod}:${status}`;
                    counts[status] = orderMap.get(key) || 0;
                });
                formattedData.push({
                    period: expectedPeriod,
                    counts
                });
            }

            // Tính tổng số đơn hàng
            const totalOrders = formattedData.reduce((sum, item) => sum + Object.values(item.counts).reduce((s, c) => s + c, 0), 0);
            const statusCounts = formattedData.reduce((acc, item) => {
                Object.keys(item.counts).forEach(status => {
                    acc[status] = (acc[status] || 0) + item.counts[status];
                });
                return acc;
            }, { pending: 0, paid: 0, processing: 0, shipped: 0, completed: 0, canceled: 0 });

            return {
                month: month || null,
                startDate,
                endDate,
                orders: formattedData,
                totalOrders,
                statusCounts
            };
        }));

        // Tổng hợp
        const overview = {
            orders: monthlyStats.flatMap(stat => stat.orders),
            totalOrders: monthlyStats.reduce((sum, stat) => sum + stat.totalOrders, 0),
            statusCounts: monthlyStats
                .filter(stat => {
                    const statDate = new Date(stat.startDate);
                    const statYear = statDate.getFullYear();
                    const statMonth = statDate.getMonth() + 1;
                    return statYear < currentYear || (statYear === currentYear && statMonth <= currentMonth);
                })
                .reduce((acc, stat) => {
                    Object.keys(stat.statusCounts).forEach(status => {
                        acc[status] = (acc[status] || 0) + stat.statusCounts[status];
                    });
                    return acc;
                }, { pending: 0, paid: 0, shipped: 0, completed: 0, canceled: 0 })
        };

        return ResponseModel.success('Thống kê hoạt động đơn hàng', { monthlyStats, overview });
    } catch (error) {
        ResponseModel.error(error?.status || 500, error?.message || 'Lỗi server', error?.body);
    }
};

export const fetchProductPerformanceStats = async ({ dateRanges, groupBy = 'day' }) => {
    try {
        // Kiểm tra đầu vào
        if (!dateRanges || !Array.isArray(dateRanges) || !['day', 'week', 'month'].includes(groupBy)) {
            return ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu hoặc sai định dạng dateRanges/groupBy', {
                dateRanges, groupBy
            });
        }

        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        const currentDay = currentDate.getDate();

        const groupByExpression = {
            day: Sequelize.fn('DATE', Sequelize.col('Product.createdAt')),
            week: Sequelize.fn('DATE_FORMAT', Sequelize.col('Product.createdAt'), '%Y-%u'),
            month: Sequelize.fn('DATE_FORMAT', Sequelize.col('Product.createdAt'), '%Y-%m')
        }[groupBy];

        const groupByAlias = groupByExpression;

        const monthlyStats = await Promise.all(dateRanges.map(async (range) => {
            const { startDate, endDate, month } = range;

            // Kiểm tra tháng hợp lệ
            const rangeDate = new Date(startDate);
            const rangeYear = rangeDate.getFullYear();
            const rangeMonth = rangeDate.getMonth() + 1;
            if (rangeYear > currentYear || (rangeYear === currentYear && rangeMonth > currentMonth)) {
                return {
                    month: month || null,
                    startDate,
                    endDate,
                    productsListed: [],
                    totalProductsListed: 0,
                    topProducts: [],
                    lowRatedProducts: []
                };
            }

            // Truy vấn sản phẩm đăng bán
            const productData = await db.Product.findAll({
                where: {
                    createdAt: { [Op.between]: [startDate, endDate] }
                },
                attributes: [
                    [groupByExpression, 'period'],
                    [Sequelize.fn('COUNT', Sequelize.col('Product.id')), 'count']
                ],
                group: [groupByAlias],
                order: [[Sequelize.col('period'), 'ASC']],
                raw: true
            });

            const productMap = new Map(productData.map(item => [item.period, parseInt(item.count || 0)]));

            // Truy vấn sản phẩm bán chạy (top 5 mỗi ngày)
            const topProductsData = await db.Product.findAll({
                where: {
                    createdAt: { [Op.between]: [startDate, endDate] }
                },
                attributes: ['id', 'product_name', 'sold_quantity', [groupByExpression, 'period']],
                order: [['sold_quantity', 'DESC']],
                raw: true
            });

            const topProductsMap = new Map();
            topProductsData.forEach(item => {
                if (!topProductsMap.has(item.period)) topProductsMap.set(item.period, []);
                topProductsMap.get(item.period).push({
                    id: item.id,
                    product_name: item.product_name,
                    sold_quantity: item.sold_quantity
                });
            });

            // Truy vấn sản phẩm đánh giá thấp (rating <= 2)
            const subQueryRating = sequelize.literal(`(
                SELECT AVG(rating)
                FROM Reviews
                WHERE Reviews.product_id = Product.id
            )`);
            const lowRatedProductsData = await db.Product.findAll({
                where: {
                    createdAt: { [Op.between]: [startDate, endDate] }
                },
                attributes: [
                    'id',
                    'product_name',
                    [groupByExpression, 'period'],
                    [subQueryRating, 'avgRating']
                ],
                having: Sequelize.literal('AVG(Reviews.rating) <= 2'),
                include: [{
                    model: db.Review,
                    as: 'reviews',
                    attributes: [],
                    required: true // Chỉ lấy sản phẩm có review
                }],
                group: ['Product.id', groupByAlias],
                raw: true
            });

            const lowRatedProductsMap = new Map();
            lowRatedProductsData.forEach(item => {
                if (!lowRatedProductsMap.has(item.period)) lowRatedProductsMap.set(item.period, []);
                lowRatedProductsMap.get(item.period).push({
                    id: item.id,
                    product_name: item.product_name,
                    avgRating: parseFloat(item.avgRating)
                });
            });

            // Định dạng dữ liệu
            const formattedData = [];
            const start = new Date(startDate);
            const end = new Date(endDate);

            if (groupBy === 'day') {
                // Lặp qua tất cả ngày trong tháng
                for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                    const period = d.toISOString().split('T')[0]; // Định dạng YYYY-MM-DD
                    const day = d.getDate();
                    // Ngày tương lai trả về 0
                    if (rangeYear === currentYear && rangeMonth === currentMonth && day > currentDay) {
                        formattedData.push({
                            period,
                            productsListed: 0,
                            topProducts: [],
                            lowRatedProducts: []
                        });
                        continue;
                    }

                    formattedData.push({
                        period,
                        productsListed: productMap.get(period) || 0,
                        topProducts: topProductsMap.get(period)?.slice(0, 5) || [],
                        lowRatedProducts: lowRatedProductsMap.get(period) || []
                    });
                }
            } else if (groupBy === 'month') {
                const year = new Date(startDate).getFullYear();
                const expectedPeriod = `${year}-${month.toString().padStart(2, '0')}`;
                formattedData.push({
                    period: expectedPeriod,
                    productsListed: productMap.get(expectedPeriod) || 0,
                    topProducts: topProductsMap.get(expectedPeriod)?.slice(0, 5) || [],
                    lowRatedProducts: lowRatedProductsMap.get(expectedPeriod) || []
                });
            }

            // Tính tổng số sản phẩm
            const totalProductsListed = formattedData.reduce((sum, item) => sum + item.productsListed, 0);

            return {
                month: month || null,
                startDate,
                endDate,
                productsListed: formattedData,
                totalProductsListed,
                topProducts: formattedData.flatMap(item => item.topProducts),
                lowRatedProducts: formattedData.flatMap(item => item.lowRatedProducts)
            };
        }));

        // Tổng hợp
        const overview = {
            productsListed: monthlyStats.flatMap(stat => stat.productsListed),
            totalProductsListed: monthlyStats.reduce((sum, stat) => sum + stat.totalProductsListed, 0),
            topProducts: monthlyStats
                .flatMap(stat => stat.topProducts)
                .sort((a, b) => b.sold_quantity - a.sold_quantity)
                .slice(0, 5),
            lowRatedProducts: monthlyStats
                .flatMap(stat => stat.lowRatedProducts)
                .sort((a, b) => a.avgRating - b.avgRating) // Sắp xếp theo rating thấp nhất
                .slice(0, 5)
        };

        return ResponseModel.success('Thống kê hiệu suất sản phẩm', {
            monthlyStats,
            overview
        });
    } catch (error) {
        return ResponseModel.error(error?.status || 500, error?.message || 'Lỗi server', error?.body);
    }
};
// => Thống kê doanh thu của các cửa hàng
export const fetchShopRevenueStats = async ({ dateRanges, groupBy = 'day' }) => {
    try {
        // Kiểm tra đầu vào
        if (!dateRanges || !Array.isArray(dateRanges) || !['day', 'week', 'month'].includes(groupBy)) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu hoặc sai định dạng dateRanges/groupBy', {
                dateRanges,
                groupBy
            });
        }

        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        const currentDay = currentDate.getDate();

        // Xác định biểu thức groupBy
        const groupByExpression = {
            day: db.sequelize.fn('DATE', db.sequelize.col('OrderShop.createdAt')),
            week: db.sequelize.fn('DATE_FORMAT', db.sequelize.col('OrderShop.createdAt'), '%Y-%u'),
            month: db.sequelize.fn('DATE_FORMAT', db.sequelize.col('OrderShop.createdAt'), '%Y-%m')
        }[groupBy];

        // Thống kê cho từng khoảng thời gian trong dateRanges
        const stats = await Promise.all(dateRanges.map(async (range) => {
            const { startDate, endDate, month } = range;

            // Kiểm tra tháng hợp lệ
            const rangeDate = new Date(startDate);
            const rangeYear = rangeDate.getFullYear();
            const rangeMonth = rangeDate.getMonth() + 1;
            if (rangeYear > currentYear || (rangeYear === currentYear && rangeMonth > currentMonth)) {
                return {
                    month: month || null,
                    startDate,
                    endDate,
                    shopRevenues: []
                };
            }

            // Truy vấn doanh thu theo cửa hàng, chỉ tính trạng thái completed
            const revenueData = await db.OrderShop.findAll({
                where: {
                    createdAt: { [Op.between]: [startDate, endDate] },
                    status: OrderStatus.COMPLETED
                },
                include: [{
                    model: db.Shop,
                    as: 'shop',
                    attributes: ['id', 'shop_name']
                }],
                attributes: [
                    [Sequelize.col('shop.shop_name'), 'shop_name'],
                    [Sequelize.fn('SUM', Sequelize.col('OrderShop.final_total')), 'revenue']
                ],
                group: ['OrderShop.shop_id', 'shop.shop_name'],
                raw: true
            });

            // Định dạng dữ liệu
            const shopRevenues = revenueData.map(item => ({
                shop_name: item.shop_name || 'Không xác định',
                revenue: parseFloat(item.revenue || 0)
            }));

            return {
                month: month || null,
                startDate,
                endDate,
                shopRevenues
            };
        }));

        // Tổng hợp
        const overview = {
            shopRevenues: stats.flatMap(stat => stat.shopRevenues)
                .reduce((acc, curr) => {
                    const existing = acc.find(item => item.shop_name === curr.shop_name);
                    if (existing) {
                        existing.revenue += curr.revenue;
                    } else {
                        acc.push({ ...curr });
                    }
                    return acc;
                }, [])
                .filter(item => item.revenue > 0) // Loại bỏ cửa hàng không có doanh thu
        };

        return ResponseModel.success('Thống kê doanh thu theo cửa hàng', { monthlyStats: stats, overview });
    } catch (error) {
        ResponseModel.error(error?.status || 500, error?.message || 'Lỗi server', error?.body);
    }
};

export const fetchProductCategoryStats = async ({ dateRanges, groupBy = 'day' }) => {
    try {
        // Kiểm tra đầu vào
        if (!dateRanges || !Array.isArray(dateRanges) || !['day', 'week', 'month'].includes(groupBy)) {
            return ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu hoặc sai định dạng dateRanges/groupBy', {
                dateRanges,
                groupBy
            });
        }

        const parentCategories = await db.Category.findAll({
            where: { parentId: null },
            attributes: ['id', 'category_name']
        });

        const categoryStats = await Promise.all(parentCategories.map(async (parent) => {
            // Lấy danh mục con của danh mục cha
            const subCategories = await db.Category.findAll({
                where: { parentId: parent.id },
                attributes: ['id']
            });

            // Nếu không có danh mục con, trả về count = 0
            if (subCategories.length === 0) {
                return {
                    category_name: parent.category_name || 'Không xác định',
                    count: 0
                };
            }

            // Danh sách ID của danh mục con
            const subCategoryIds = subCategories.map(sub => sub.id);

            // Đếm sản phẩm thuộc danh mục con
            const productCount = await db.Product.count({
                where: {
                    categoryId: { [Op.in]: subCategoryIds }
                }
            });

            return {
                category_name: parent.category_name || 'Không xác định',
                count: productCount
            };
        }));


        // Tổng hợp
        const overview = {
            categoryStats: categoryStats
        };

        return ResponseModel.success('Thống kê sản phẩm theo danh mục cha', {
            overview
        });
    } catch (error) {
        ResponseModel.error(error?.status || 500, error?.message || 'Lỗi server', error?.body);
    }
};