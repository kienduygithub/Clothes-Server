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
    Color,
    Size,
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
            throw ResponseModel.error(HttpErrors.BAD_REQUEST, 'Người dùng không tồn tại', {
                user_id
            });
        }

        const orders = await Order.findAll({
            where: {
                user_id: user_id,
                status: OrderStatus.COMPLETED, /** Tạm thời chưa cần do chưa làm bên admin, nhớ comment lại **/
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
                                                    attributes: ['id', 'category_name', 'parentId'],
                                                    include: {
                                                        model: Category,
                                                        as: 'parent',
                                                        attributes: ['id', 'category_name'],
                                                        required: false
                                                    },
                                                    required: false
                                                },
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
            attributes: ['order_item_id'],
            transaction
        });

        const reviewedOrderItemIds = new Set(reviews.map(
            (review) => review.order_item_id
        ));

        const unreviewedPurchases = [];
        let index = 0;
        for (const order of orders) {
            for (const orderShop of order.order_shops) {
                for (const orderItem of orderShop.order_shop_items) {
                    if (!reviewedOrderItemIds.has(orderItem.id)) {
                        index += 1;
                        const product = orderItem.product_variant.product;
                        unreviewedPurchases.push({
                            id: index,
                            user: {
                                id: user.id,
                                name: user.name,
                                image_url: user.image_url
                            },
                            order_id: order.id,
                            order_item_id: orderItem.id,
                            product_id: product.id,
                            product_variant_id: orderItem.product_variant.id,
                            product_name: product.product_name,
                            image_url: orderItem.product_variant.image_url || (product.product_images && product.product_images[0]?.image_url) || null,
                            purchased_at: order.createdAt,
                            quantity: orderItem.quantity,
                            category: product.category ? {
                                id: product.category.id,
                                category_name: product.category.category_name,
                                parent: product.category.parent ? {
                                    id: product.category.parent.id,
                                    category_name: product.category.parent.category_name
                                } : undefined
                            } : undefined,
                        })
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

export const fetchListReviewedPurchaseUser = async (user_id) => {
    const transaction = await sequelize.transaction();
    try {
        if (!user_id) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                user_id: user_id ?? ''
            });
        }

        const user = await User.findByPk(user_id, {
            attributes: ['id', 'name', 'image_url'],
            transaction
        });

        if (!user) {
            throw ResponseModel.error(HttpErrors.BAD_REQUEST, 'Người dùng không tồn tại', {
                user_id
            });
        }

        const reviews = await Review.findAll({
            where: { user_id: user_id },
            include: [
                {
                    model: Product,
                    as: 'product_review',
                    attributes: ['id', 'product_name'],
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
                            attributes: ['id', 'category_name', 'parentId'],
                            include: {
                                model: Category,
                                as: 'parent',
                                attributes: ['id', 'category_name'],
                                required: false
                            },
                            required: false
                        },
                        {
                            model: Shop,
                            as: 'shop',
                            attributes: ['id', 'shop_name', 'logo_url'],
                        }
                    ]
                },
                {
                    model: OrderItem,
                    as: 'order_item',
                    attributes: ['id', 'product_variant_id', 'quantity'],
                    include: [
                        {
                            model: ProductVariant,
                            as: 'product_variant',
                            attributes: ['id', 'image_url', 'colorId', 'sizeId'],
                            include: [
                                { model: Color, as: 'color', attributes: ['id', 'color_name'], required: false },
                                { model: Size, as: 'size', attributes: ['id', 'size_code'], required: false }
                            ]
                        }
                    ],
                }
            ],
            order: [['createdAt', 'DESC']],
            transaction: transaction
        });

        const reviewedPurchases = reviews.map(review => ({
            id: review.id,
            user: {
                id: user.id,
                name: user.name,
                image_url: user.image_url
            },
            review: {
                id: review.id,
                rating: review.rating,
                comment: review.comment,
                created_at: review.createdAt
            },
            product_id: review.product_review.id,
            product_variant_id: review.order_item.product_variant.id,
            order_item_id: review.order_item.id,
            product_name: review.product_review.product_name,
            image_url: review.order_item.product_variant.image_url || (review.product_review.product_images && review.product_review.product_images[0]?.image_url) || undefined,
            color: review.order_item.product_variant.color ? {
                id: review.order_item.product_variant.color.id,
                color_name: review.order_item.product_variant.color.color_name
            } : undefined,
            size: review.order_item.product_variant.size ? {
                id: review.order_item.product_variant.size.id,
                size_code: review.order_item.product_variant.size.size_code
            } : undefined,
            category: review.product_review.category ? {
                id: review.product_review.category.id,
                category_name: review.product_review.category.category_name,
                parent: review.product_review.category.parent ? {
                    id: review.product_review.category.parent.id,
                    category_name: review.product_review.category.parent.category_name
                } : undefined
            } : undefined,
            shop: review.product_review.shop ? {
                id: review.product_review.shop.id,
                shop_name: review.product_review.shop.shop_name,
                logo_url: review.product_review.shop.logo_url
            } : undefined,
            quantity: review.order_item.quantity
        }));

        await transaction.commit();

        return ResponseModel.success('Danh sách Reviewed Purchases', {
            reviewedPurchases: reviewedPurchases
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Lỗi khi lấy danh sách sản phẩm đã đánh giá:', {
            error: error.message,
            user_id,
            stack: error.stack
        });
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const addReviewPurchaseUser = async (user_id, reviewInfo) => {
    const t = await sequelize.transaction();
    try {
        if (!user_id || !reviewInfo) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                user_id: user_id ?? '',
                reviewInfo: reviewInfo ?? {}
            });
        }

        const {
            product_id,
            order_item_id,
            rating,
            comment
        } = reviewInfo;

        if (!rating || !comment || !product_id || !order_item_id) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                rating: rating ?? '',
                comment: comment ?? '',
                order_item_id: order_item_id ?? '',
                product_id: product_id ?? ''
            });
        }

        if (rating < 1 || rating > 5) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Rating phải từ 1 đến 5', {});
        }

        // Kiểm tra OrderItem tồn tại và khớp product_id
        const orderItem = await OrderItem.findByPk(order_item_id, {
            include: [
                {
                    model: ProductVariant,
                    as: 'product_variant',
                    attributes: ['productId']
                }
            ],
            transaction: t
        });

        if (!orderItem || orderItem.product_variant.productId !== product_id) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'OrderItem không hợp lệ hoặc không khớp với product_id', {
                order_item_id,
                product_id
            });
        }

        // Kiểm tra OrderItem chưa có Review (quan hệ 1-1)
        const existingReview = await Review.findOne({
            where: { order_item_id },
            transaction: t
        });

        if (existingReview) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'OrderItem này đã được đánh giá', {
                order_item_id
            });
        }

        const review = await Review.create({
            user_id: user_id,
            product_id: product_id,
            order_item_id: order_item_id,
            rating: rating,
            comment: comment
        }, { transaction: t });

        const formattedReview = {
            id: review.id,
            user_id: user_id,
            product_id: product_id,
            order_item_id: order_item_id,
            rating: rating,
            comment: comment,
            created_at: review.createdAt,
        }

        await t.commit();

        return ResponseModel.success('Review sản phẩm thành công', {
            updatedReviews: [formattedReview]
        });
    } catch (error) {
        await t.rollback();
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const fetchReviewsByProduct = async (product_id, page = 1, limit = 10) => {
    const t = await sequelize.transaction();
    try {
        if (!product_id) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                product_id: product_id ?? ''
            });
        }

        const product = await Product.findByPk(product_id, {
            attributes: ['id', 'product_name', 'unit_price'],
            transaction: t
        });

        if (!product) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Sản phẩm không tồn tại', {});
        }

        const offset = (page - 1) * limit;

        const { count, rows: reviews } = await Review.findAndCountAll({
            where: { product_id: product_id },
            include: [
                {
                    model: User,
                    as: 'user_review',
                    attributes: ['id', 'name', 'image_url'],
                },
                {
                    model: Product,
                    as: 'product_review',
                    attributes: ['id', 'product_name', 'unit_price'],
                    include: [
                        {
                            model: Category,
                            as: 'category',
                            attributes: ['id', 'category_name', 'parentId'],
                            include: {
                                model: Category,
                                as: 'parent',
                                attributes: ['id', 'category_name'],
                                required: false
                            },
                            required: false
                        },
                        {
                            model: Shop,
                            as: 'shop',
                            attributes: ['id', 'shop_name', 'logo_url'],
                        }
                    ]
                },
                {
                    model: OrderItem,
                    as: 'order_item',
                    attributes: ['id', 'product_variant_id', 'quantity'],
                    required: false,
                    include: [
                        {
                            model: ProductVariant,
                            as: 'product_variant',
                            attributes: ['id', 'image_url', 'colorId', 'sizeId'],
                            include: [
                                { model: Color, as: 'color', attributes: ['id', 'color_name'], required: false },
                                { model: Size, as: 'size', attributes: ['id', 'size_code'], required: false }
                            ],
                            required: false
                        }
                    ]
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: limit,
            offset: offset,
            transaction: t
        });

        const formattedReviews = reviews.map(review => ({
            id: review.id,
            user: {
                id: review.user_review.id,
                name: review.user_review.name,
                image_url: review.user_review.image_url
            },
            review: {
                id: review.id,
                rating: review.rating,
                comment: review.comment,
                created_at: review.createdAt
            },
            product_id: review.product_review.id,
            product_variant_id: review.order_item.product_variant.id,
            order_item_id: review.order_item.id,
            product_name: review.product_review.product_name,
            image_url: review.order_item.product_variant.image_url || undefined,
            color: review.order_item.product_variant.color ? {
                id: review.order_item.product_variant.color.id,
                color_name: review.order_item.product_variant.color.color_name
            } : undefined,
            size: review.order_item.product_variant.size ? {
                id: review.order_item.product_variant.size.id,
                size_code: review.order_item.product_variant.size.size_code
            } : undefined,
            category: review.product_review.category ? {
                id: review.product_review.category.id,
                category_name: review.product_review.category.category_name,
                parent: review.product_review.category.parent ? {
                    id: review.product_review.category.parent.id,
                    category_name: review.product_review.category.parent.category_name
                } : undefined
            } : undefined,
            shop: review.product_review.shop ? {
                id: review.product_review.shop.id,
                shop_name: review.product_review.shop.shop_name,
                logo_url: review.product_review.shop.logo_url
            } : undefined,
            quantity: review.order_item.quantity
        }));

        const totalPages = Math.ceil(count / limit);

        const avgRating = reviews.length > 0
            ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
            : 0;

        await t.commit();

        return ResponseModel.success('Danh sách Review SP', {
            reviews: formattedReviews,
            pagination: {
                currentPage: page,
                limit: limit,
                totalItems: count,
                totalPages: totalPages
            },
            avgRating: avgRating
        });
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