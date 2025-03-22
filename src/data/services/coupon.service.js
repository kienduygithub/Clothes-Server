import { Op } from "sequelize";
import HttpErrors from "../../common/errors/http-errors";
import { ResponseModel } from "../../common/errors/response";
import { handleDeleteImageAsFailed, handleDeleteImages } from "../../common/middleware/upload.middleware";
import { Coupon, UserCoupon, sequelize } from "../models";

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

export const editCategory = async (parent_id, categoryInfo, file) => {
    try {
        if (!parent_id || !categoryInfo) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu trường cần thiết', null);
        }

        const existCategory = await Category.findOne({
            where: { id: parent_id, parentId: null }
        });

        if (!existCategory) {
            ResponseModel.error(HttpErrors.NOT_FOUND, 'Không tìm thấy danh mục', null);
        }

        const {
            category_name,
            description
        } = JSON.parse(categoryInfo);

        const conflictCategoryName = await Category.findOne({
            where: {
                category_name: category_name,
                parentId: null,
                id: { [Op.ne]: parent_id }
            }
        });

        if (conflictCategoryName) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Tên danh mục đã tồn tại', null);
        }

        existCategory.category_name = category_name;
        existCategory.description = description;
        if (file) {
            const deleteFilename = existCategory.dataValues.image_url;
            await handleDeleteImages([deleteFilename]);
            existCategory.image_url = `categories/${file.filename}`;
        }

        await existCategory.save();
        const payload = {
            categories: [existCategory]
        }
        return ResponseModel.success('Chỉnh sửa danh mục thành công', payload);
    } catch (error) {
        handleDeleteImageAsFailed(file);
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const deleteCategory = async (parent_id) => {
    try {
        if (!parent_id) {
            return ResponseModel.error(HttpErrors.BAD_REQUEST, "Thiếu trường cần thiết", null);
        }

        const category = await Category.findOne({
            where: { id: parent_id, parentId: null }
        });

        if (!category) {
            return ResponseModel.error(HttpErrors.NOT_FOUND, "Không tìm thấy danh mục", null);
        }

        const subCategories = await Category.findAll({
            where: { parentId: parent_id }
        });

        if (subCategories.length > 0) {
            return ResponseModel.error(HttpErrors.BAD_REQUEST, "Không thể xóa danh mục cha khi còn danh mục con", null);
        }

        const deletedFilename = category.dataValues.image_url;

        if (deletedFilename !== '') {
            await handleDeleteImages([deletedFilename]);
        }

        await Category.destroy({
            where: { id: parent_id }
        });

        return ResponseModel.success("Xóa danh mục thành công", null);
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}