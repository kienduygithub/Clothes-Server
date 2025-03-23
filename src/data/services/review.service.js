import HttpErrors from "../../common/errors/http-errors";
import { ResponseModel } from "../../common/errors/response"
import { Product, Review, User, sequelize } from "../models";

export const fetchReviewsByProduct = async (product_id) => {
    try {
        if (!product_id) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                product_id: product_id ?? ''
            });
        }

        const product = await Product.findOne({
            where: { id: product_id }
        });

        if (!product) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Sản phẩm không tồn tại', {});
        }

        const reviews = await Review.findAll({
            where: { product_id: product_id }
        });

        const payload = {
            reviews: reviews
        };

        return ResponseModel.success('Danh sách Review', payload);
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const reviewProductByUser = async (user_id, product_id, reviewInfo) => {
    const t = await sequelize.transaction();
    try {
        if (!user_id || !product_id || !reviewInfo) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                user_id: user_id ?? '',
                product_id: product_id ?? '',
                reviewInfo: reviewInfo ?? {}
            });
        }

        const user = await Product.findOne({
            where: { id: user_id },
            transaction: t
        });

        if (!user) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Người dùng không tồn tại', {});
        }

        const product = await Product.findOne({
            where: { id: product_id },
            transaction: t
        });

        if (!product) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Sản phẩm không tồn tại', {});
        }

        const {
            rating,
            comment
        } = reviewInfo;

        if (!rating || !comment) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                rating: rating ?? '',
                comment: comment ?? '',
            });
        }

        if (rating > 5) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Rating không lớn hơn 5', {});
        }

        const review = await Review.create({
            user_id: user_id,
            product_id: product_id,
            rating: rating,
            comment: comment
        }, { transaction: t });

        const payload = {
            reviews: [review]
        };

        await t.commit();

        return ResponseModel.success('Review sản phẩm thành công', payload);
    } catch (error) {
        await t.rollback();
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const editReviewProductByUser = async (user_id, product_id, review_id, reviewInfo) => {
    const t = await sequelize.transaction();
    try {
        if (!user_id || !product_id || !review_id || !reviewInfo) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                user_id: user_id ?? '',
                product_id: product_id ?? '',
                review_id: review_id ?? '',
                reviewInfo: reviewInfo ?? {}
            });
        }

        const review = await Review.findOne({
            where: { id: review_id },
            transaction: t
        })

        if (!review) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Review không tồn tại', {});
        }

        console.log(review);

        const {
            rating,
            comment
        } = reviewInfo;

        if (!rating || !comment) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                rating: rating ?? '',
                comment: comment ?? '',
            });
        }

        if (rating > 5) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Rating không lớn hơn 5', {});
        }

        const updatedReviews = await Review.update({
            rating: rating,
            comment: comment
        }, {
            where: { id: review_id },
            transaction: t
        });

        const payload = {
            reviews: [updatedReviews]
        };

        await t.commit();

        return ResponseModel.success('Edit Review sản phẩm thành công', payload);
    } catch (error) {
        await t.rollback();
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const deleteReviewProductByUser = async (user_id, review_id) => {
    const t = await sequelize.transaction();
    try {
        if (!user_id || !review_id) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                user_id: user_id ?? '',
                review_id: review_id ?? '',
            });
        }

        const deleteCount = await Review.destroy({
            where: { id: review_id, user_id: user_id },
            transaction: t
        });

        if (deleteCount === 0) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Review không tồn tại', {});
        }

        await t.commit();

        return ResponseModel.success(`Xóa Review sản phẩm thành công`, {});
    } catch (error) {
        await t.rollback();
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}