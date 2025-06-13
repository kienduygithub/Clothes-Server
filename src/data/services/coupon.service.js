import { Op } from "sequelize";
import HttpErrors from "../../common/errors/http-errors";
import { ResponseModel } from "../../common/errors/response";
import { Coupon, UserCoupon, User, Shop, sequelize, Sequelize } from "../models";

export const fetchShopCoupons = async (shopId) => {
    try {
        if (!shopId) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu trường cần thiết', {
                shopId: shopId ?? ''
            });
        }

        const coupons = await Coupon.findAll({
            where: { shop_id: shopId },
        })

        const payload = {
            coupons: coupons?.map(
                coupon => {
                    let data = coupon.dataValues;
                    return ({
                        ...data,
                        valid_from: data?.valid_from === null ? '*' : data?.valid_from,
                        valid_to: data?.valid_to === null ? '*' : data?.valid_to
                    })
                }
            ),
            shop_id: shopId
        }

        return ResponseModel.success('Danh sách coupon: ', payload);
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const fetchCouponById = async (coupon_id) => {
    try {
        if (!coupon_id) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu trường cần thiết', {
                coupon_id: coupon_id ?? ''
            });
        }

        const coupon = await Coupon.findOne({
            where: { id: coupon_id },
            attributes: { exclude: ['createdAt', 'updatedAt'] }
        });

        if (!coupon) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Không tìm thấy Coupon');
        }

        let data = coupon.dataValues;
        let respCoupon = {
            ...data,
            valid_from: data?.valid_from === null ? '*' : data?.valid_from,
            valid_to: data?.valid_to === null ? '*' : data?.valid_to
        }


        const payload = {
            coupons: [respCoupon]
        };

        return ResponseModel.success(`Coupon ${respCoupon.name}`, payload);
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

/** Sử dụng Coupon */
export const updateTimesUsedCouponById = async (user_id, coupon_id) => {
    const transaction = await sequelize.transaction();
    try {
        if (!user_id || !coupon_id) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                user_id: user_id ?? '',
                coupon_id: coupon_id ?? ''
            });
        }

        const coupon = await Coupon.findOne({
            where: { id: coupon_id }
        });

        if (!coupon) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Không tìm thấy Coupon');
        }

        if (coupon.max_usage !== -1 && coupon.times_used >= coupon.max_usage) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Coupon đã hết lượt sử dụng');
        }

        const userCoupon = await UserCoupon.findOne({
            where: { user_id: user_id, coupon_id: coupon_id },
            transaction: transaction
        });

        if (userCoupon && userCoupon.is_used === true) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Coupon đã được sử dụng');
        }

        if (!userCoupon) {
            await UserCoupon.create({
                user_id: user_id,
                coupon_id: coupon.id,
                is_used: true
            }, { transaction });
        } else {
            await userCoupon.update({ is_used: true }, { transaction });
        }

        await coupon.increment('times_used', { by: 1, transaction });
        await transaction.commit();
        return ResponseModel.success(`Sử dụng Coupon thành công`, {});
    } catch (error) {
        await transaction.rollback();
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const addNewCoupon = async (shop_id, couponInfo) => {
    const t = await sequelize.transaction();
    try {
        if (!shop_id || !couponInfo) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu trường cần thiết', {
                shop_id: shop_id ?? '',
                couponInfo: couponInfo ?? {}
            });
        }

        const {
            name,
            code,
            discount_type,
            discount_value,
            max_discount,
            min_order_value,
            max_usage,
            valid_from,
            valid_to
        } = couponInfo;

        const existNameCoupon = await Coupon.findOne({
            where: { name: name },
            transaction: t
        });

        if (existNameCoupon) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Tên Coupon đã tồn tại');
        }

        const existCodeCoupon = await Coupon.findOne({
            where: { code: code },
            transaction: t
        });

        if (existCodeCoupon) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Mã Coupon đã tồn tại');
        }

        const newCoupon = await Coupon.create({
            shop_id: shop_id,
            name: name,
            code: code,
            discount_type: discount_type,
            discount_value: discount_value,
            max_discount: max_discount,
            min_order_value: min_order_value,
            times_used: 0,
            max_usage: max_usage,
            valid_from: valid_from === '*' ? null : valid_from,
            valid_to: valid_to === '*' ? null : valid_to
        },
            { transaction: t }
        );

        await t.commit();

        const payload = {
            coupons: [newCoupon]
        }

        return ResponseModel.success("Tạo Coupon thành công", payload);
    } catch (error) {
        console.log(error);
        await t.rollback();
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const editCoupon = async (coupon_id, couponInfo) => {
    const t = await sequelize.transaction();
    try {
        if (!coupon_id || !couponInfo) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu trường cần thiết', {
                coupon_id: coupon_id ?? '',
                couponInfo: couponInfo ?? {}
            });
        }

        const coupon = await Coupon.findOne({
            where: { id: coupon_id },
            transaction: t
        });

        if (!coupon) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Không tìm thấy Coupon', {});
        }

        const {
            name,
            code,
            discount_type,
            discount_value,
            max_discount,
            min_order_value,
            max_usage,
            valid_from,
            valid_to
        } = couponInfo;

        if (coupon.name !== name) {
            const existNameCoupon = await Coupon.findOne({
                where: { name: name },
                transaction: t
            });

            if (existNameCoupon) {
                ResponseModel.error(HttpErrors.BAD_REQUEST, 'Tên Coupon đã tồn tại');
            }
        }

        if (coupon.code !== code) {
            const existCodeCoupon = await Coupon.findOne({
                where: { code: code },
                transaction: t
            });

            if (existCodeCoupon) {
                ResponseModel.error(HttpErrors.BAD_REQUEST, 'Mã Coupon đã tồn tại');
            }
        }


        const updatedCoupon = await coupon.update({
            name: name,
            code: code,
            discount_type: discount_type,
            discount_value: discount_value,
            max_discount: max_discount,
            min_order_value: min_order_value,
            times_used: 0,
            max_usage: max_usage,
            valid_from: valid_from === '*' ? null : valid_from,
            valid_to: valid_to === '*' ? null : valid_to
        },
            { transaction: t }
        );

        await t.commit();

        const payload = {
            coupons: [updatedCoupon]
        }

        return ResponseModel.success("Cập nhật Coupon thành công", payload);
    } catch (error) {
        console.log(error);
        await t.rollback();
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const deleteCoupon = async (coupon_id) => {
    const t = await sequelize.transaction();
    try {
        if (!coupon_id) {
            return ResponseModel.error(HttpErrors.BAD_REQUEST, "Thiếu trường cần thiết", {
                coupon_id: coupon_id ?? ''
            });
        }

        const coupon = await Coupon.findOne({
            where: { id: coupon_id },
            transaction: t
        });

        if (!coupon) {
            return ResponseModel.error(HttpErrors.BAD_REQUEST, "Không tìm thấy Coupon", {});
        }

        await Coupon.destroy({
            where: { id: coupon_id }
        }, { transaction: t });

        return ResponseModel.success("Xóa Coupon thành công", {});
    } catch (error) {
        await t.rollback();
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

/** MOBILE **/

export const fetchShopCouponMobile = async (userId, shopId) => {
    try {
        if (!userId || !shopId) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                userId: userId ?? '',
                shopId: shopId ?? ''
            })
        }

        const currentTime = new Date();
        const coupons = await Coupon.findAll({
            where: {
                shop_id: shopId,
                [Op.and]: [
                    {
                        [Op.or]: [
                            { valid_from: { [Op.lte]: currentTime } },
                            { valid_from: null }
                        ]
                    },
                    {
                        [Op.or]: [
                            { valid_to: { [Op.gte]: currentTime } },
                            { valid_to: null }
                        ]
                    },
                    {
                        [Op.or]: [
                            { max_usage: null },
                            { max_usage: -1 },
                            { max_usage: { [Op.gt]: Sequelize.col('times_used') } }
                        ]
                    }
                ]
            },
            attributes: { exclude: ['createdAt', 'updatedAt'] },
            include: [
                {
                    model: User,
                    as: 'user_coupons',
                    through: {
                        model: UserCoupon,
                        attributes: ['is_used'],
                    },
                    where: { id: userId },
                    required: false /** Left join để lấy cả coupon chưa lưu */
                },
                {
                    model: Shop,
                    as: 'shop',
                    attributes: ['id', 'shop_name', 'logo_url']
                }
            ]
        });

        const formattedCoupons = coupons.map(coupon => ({
            id: coupon.id,
            shop: coupon.shop,
            name: coupon.name,
            code: coupon.code,
            discount_type: coupon.discount_type,
            discount_value: parseFloat(coupon.discount_value),
            max_discount: parseFloat(coupon.max_discount),
            min_order_value: parseFloat(coupon.min_order_value),
            valid_from: coupon.valid_from,
            valid_to: coupon.valid_to,
            is_saved: !!coupon.user_coupons.length, /** Kiểm tra đã lưu */
            is_used: coupon.user_coupons.length ? coupon.user_coupons[0].UserCoupon.is_used : false
        }));

        const payload = {
            coupons: formattedCoupons
        }

        return ResponseModel.success('Danh sách KM Mobile', payload);
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const fetchShopCouponOnlyMobile = async (shopId) => {
    try {
        if (!shopId) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                shopId: shopId ?? ''
            })
        }

        const currentTime = new Date();
        const coupons = await Coupon.findAll({
            where: {
                shop_id: shopId,
                [Op.and]: [
                    {
                        [Op.or]: [
                            { valid_from: { [Op.lte]: currentTime } },
                            { valid_from: null }
                        ]
                    },
                    {
                        [Op.or]: [
                            { valid_to: { [Op.gte]: currentTime } },
                            { valid_to: null }
                        ]
                    },
                    {
                        [Op.or]: [
                            { max_usage: null },
                            { max_usage: -1 },
                            { max_usage: { [Op.gt]: Sequelize.col('times_used') } }
                        ]
                    }
                ]
            },
            attributes: { exclude: ['createdAt', 'updatedAt'] },
            include: [
                {
                    model: Shop,
                    as: 'shop',
                    attributes: ['id', 'shop_name', 'logo_url']
                }
            ],
        });

        const formattedCoupons = coupons.map(coupon => ({
            id: coupon.id,
            shop: coupon.shop,
            name: coupon.name,
            code: coupon.code,
            discount_type: coupon.discount_type,
            discount_value: parseFloat(coupon.discount_value),
            max_discount: parseFloat(coupon.max_discount),
            min_order_value: parseFloat(coupon.min_order_value),
            valid_from: coupon.valid_from,
            valid_to: coupon.valid_to,
        }));

        const payload = {
            coupons: formattedCoupons
        }

        return ResponseModel.success('Danh sách KM Mobile', payload);
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const fetchCouponUserMobile = async (userId) => {
    try {
        if (!userId) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                userId: userId ?? '',
            })
        }
        const coupons = await Coupon.findAll({
            attributes: { exclude: ['createdAt', 'updatedAt'] },
            include: [
                {
                    model: User,
                    as: 'user_coupons',
                    through: {
                        model: UserCoupon,
                        attributes: ['is_used'],
                        where: { user_id: userId }
                    },
                    where: { id: userId },
                },
                {
                    model: Shop,
                    as: 'shop',
                    attributes: ['id', 'shop_name', 'logo_url']
                }
            ]
        });

        const formattedCoupons = coupons.map(coupon => ({
            id: coupon.id,
            shop: coupon.shop,
            name: coupon.name,
            code: coupon.code,
            discount_type: coupon.discount_type,
            discount_value: parseFloat(coupon.discount_value),
            max_discount: parseFloat(coupon.max_discount),
            min_order_value: parseFloat(coupon.min_order_value),
            valid_from: coupon.valid_from,
            valid_to: coupon.valid_to,
            is_saved: !!coupon.user_coupons.length, /** Kiểm tra đã lưu */
            is_used: coupon.user_coupons.length ? coupon.user_coupons[0].UserCoupon.is_used : false
        }));

        const payload = {
            coupons: formattedCoupons
        }

        return ResponseModel.success('Danh sách KM Mobile', payload);
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const saveCouponMobile = async (userId, couponId) => {
    const t = await sequelize.transaction();
    try {
        if (!userId || !couponId) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, "Thiếu thông tin cần thiết", {
                userId: userId ?? '',
                couponId: couponId ?? ''
            })
        }

        const existSaved = await UserCoupon.findOne({
            where: {
                user_id: userId,
                coupon_id: couponId
            },
            transaction: t
        });

        if (existSaved) {
            return ResponseModel.success('Người dùng đã lưu KM này trước đó', {});
        }

        await UserCoupon.create({
            user_id: userId,
            coupon_id: couponId
        }, { transaction: t });

        await t.commit();

        return ResponseModel.success('Người dùng lưu KM thành công', {});
    } catch (error) {
        await t.rollback();
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}