import HttpErrors from "../../common/errors/http-errors";
import { ResponseModel } from "../../common/errors/response"
import { OrderStatus } from "../../common/utils/status";
import {
    Review,
    Order,
    OrderShop,
    OrderItem,
    Product,
    ProductVariant,
    ProductImages,
    Shop,
    Category,
    User,
    sequelize
} from "../models";

export const fetchListUnreviewPurchaseUser = async (user_id) => {
    const transaction = await sequelize.transaction();
    try {
        if (!user_id) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                user_id: user_id ?? ''
            });
        }

        const user = await User.findOne({
            where: { id: user_id },
            attributes: ['id', 'name', 'image_url'],
            transaction: transaction
        });

        if (!user) {
            throw ResponseModel.error(HttpErrors.NOT_FOUND, 'Người dùng không tồn tại', {
                user_id
            });
        }

        const orders = await Order.findAll({
            where: {
                user_id: user_id,
                // status: OrderStatus.COMPLETED, /** Tạm thời chưa cần do chưa làm bên admin **/
            },
            include: [
                {
                    model: OrderShop,
                    as: 'order_shops',
                    attributes: [
                        'id', 'order_id', 'shop_id', 'subtotal',
                        'discount', 'final_total'
                    ],
                    include: [
                        {
                            model: Shop,
                            as: 'shop',
                            attributes: ['id', 'shop_name', 'logo_url']
                        },
                        {
                            model: OrderItem,
                            as: 'order_shop_items',
                            attributes: [
                                'id', 'order_shop_id', 'product_variant_id', 'quantity'
                            ],
                            include: [
                                {
                                    model: ProductVariant,
                                    as: 'product_variant',
                                    attributes: [
                                        'id', 'productId', 'colorId', 'sizeId',
                                        'image_url'
                                    ],
                                    include: [
                                        {
                                            model: Product,
                                            as: 'product',
                                            attributes: ['id', 'product_name', 'unit_price'],
                                            include: [
                                                {
                                                    model: ProductImages,
                                                    as: 'product_images',
                                                    attributes: ['id', 'image_url'],
                                                    required: false
                                                },
                                                {
                                                    model: Category,
                                                    as: 'category',
                                                    required: false
                                                }
                                            ]
                                        },
                                    ]
                                }
                            ],
                        }
                    ]
                }
            ],
            order: [['createdAt', 'DESC']],
            transaction: transaction
        })

        const reviews = await Review.findAll({
            where: { user_id: user_id },
            attributes: ['product_id'],
            transaction
        });

        const reviewedProductIds = new Set(reviews.map(
            (review) => review.product_id
        ));

        const unreviewedPurchases = [];
        for (const order of orders) {
            for (const orderShop of order.order_shops) {
                for (const orderItem of orderShop.order_shop_items) {
                    const product = orderItem.product_variant.product;
                    if (product && !reviewedProductIds.has(product.id)) {
                        unreviewedPurchases.push({
                            user: {
                                id: user.id,
                                name: user.name,
                                image_url: user.image_url
                            },
                            product_id: product.id,
                            product_name: product.product_name,
                            image_url: orderItem.product_variant.image_url,
                            purchased_at: order.createdAt
                        });
                    }
                }
            }
        }

        await transaction.commit();

        return ResponseModel.success('Danh sách Unreview Purchases', {
            unreviewedPurchases: unreviewedPurchases
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Lỗi khi lấy danh sách sản phẩm chưa đánh giá:', {
            error: error.message,
            user_id,
            stack: error.stack
        });
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}


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