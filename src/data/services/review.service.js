import HttpErrors from "../../common/errors/http-errors";
import { ResponseModel } from "../../common/errors/response"
import { Product, Review, User, sequelize } from "../models";

export const fetchReviewsByProduct = async (product_id) => {
    const t = await sequelize.transaction();
    try {
        if (!product_id) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                product_id: product_id ?? ''
            });
        }

        const product = await Product.findOne({
            where: { id: product_id },
            transaction: t
        });

        if (!product) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Sản phẩm không tồn tại', {});
        }

        const reviews = await Review.findAll({
            where: { product_id: product_id },
            transaction: t
        }); // Có vẻ không lấy được avg rating của sản phẩm

        const avgRating = reviews.length > 0
            ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
            : 0;

        const payload = {
            reviews: reviews,
            avgRating: avgRating.toFixed(2), // Phải dùng cách thủ công như vậy or gọi API tính riêng
        };

        await t.commit();

        return ResponseModel.success('Danh sách Review', payload);
    } catch (error) {
        await t.rollback();
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const fetchReviewById = async (user_id, product_id, review_id) => {
    const t = await sequelize.transaction();
    try {
        if (!user_id || !review_id || !product_id) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                user_id: user_id ?? '',
                review_id: review_id ?? '',
                product_id: product_id ?? ''
            });
        }

        const review = await Review.findOne({
            where: { id: review_id, user_id: user_id, product_id: product_id },
            transaction: t
        });

        if (!review) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Review không tồn tại', {});
        }

        const payload = {
            reviews: [review]
        }

        await t.commit();

        return ResponseModel.success(`Chi tiết Review`, payload);
    } catch (error) {
        await t.rollback();
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

        const product_rating = await Product.findOne({
            where: { id: product_id },
            include: [
                {
                    model: Review,
                    as: 'reviews',
                    attributes: []
                }
            ],
            attributes: [
                [
                    sequelize.fn('AVG', sequelize.col('reviews.rating')),
                    "rating"
                ]
            ],
            raw: true,
            transaction: t
        })

        const payload = {
            reviews: [review],
            product_rating: product_rating.rating
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
            where: { id: review_id, user_id: user_id, product_id: product_id },
            transaction: t
        })

        if (!review) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Review không tồn tại', {});
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

        const updatedReviews = await review.update({
            rating: rating,
            comment: comment
        }, {
            transaction: t
        });

        const product_rating = await Product.findOne({
            where: { id: product_id },
            include: [
                {
                    model: Review,
                    as: 'reviews',
                    attributes: [], // Không tính avg ở đây nữa
                }
            ],
            attributes: [
                [
                    sequelize.fn('AVG', sequelize.col('reviews.rating')),
                    "rating"
                ]
            ],
            raw: true,
            transaction: t
        })

        const payload = {
            reviews: [updatedReviews],
            product_rating: product_rating.rating
        };

        await t.commit();

        return ResponseModel.success('Edit Review sản phẩm thành công', payload);
    } catch (error) {
        await t.rollback();
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const deleteReviewProductByUser = async (user_id, review_id, product_id) => {
    const t = await sequelize.transaction();
    try {
        if (!user_id || !review_id || !product_id) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                user_id: user_id ?? '',
                review_id: review_id ?? '',
                product_id: product_id ?? ''
            });
        }

        const deleteCount = await Review.destroy({
            where: { id: review_id, user_id: user_id, product_id: product_id },
            transaction: t
        });

        if (deleteCount === 0) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Review không tồn tại', {});
        }

        const product_rating = await Product.findOne({
            where: { id: product_id },
            include: [
                {
                    model: Review,
                    as: 'reviews',
                    attributes: []
                }
            ],
            attributes: [
                [
                    sequelize.fn('AVG', sequelize.col('reviews.rating')),
                    "rating"
                ]
            ],
            raw: true,
            transaction: t
        });

        await t.commit();

        const payload = {
            product_rating: product_rating.rating
        }

        return ResponseModel.success(`Xóa Review sản phẩm thành công`, payload);
    } catch (error) {
        await t.rollback();
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}