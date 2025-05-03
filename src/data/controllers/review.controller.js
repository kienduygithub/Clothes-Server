import * as ReviewService from "../services/review.service";

export const fetchReviewsByProduct = async (req, res) => {
    try {
        const product_id = req.params.productId;
        const response = await ReviewService.fetchReviewsByProduct(product_id);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const fetchReviewById = async (req, res) => {
    try {
        const user_id = req.params.userId;
        const product_id = req.params.productId;
        const review_id = req.params.reviewId;
        const response = await ReviewService.fetchReviewById(user_id, product_id, review_id);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const reviewProductByUser = async (req, res) => {
    try {
        const user_id = req.params.userId;
        const product_id = req.params.productId;
        const reviewInfo = req.body;
        const response = await ReviewService.reviewProductByUser(user_id, product_id, reviewInfo);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const editReviewProductByUser = async (req, res) => {
    try {
        const user_id = req.params.userId;
        const product_id = req.params.productId;
        const review_id = req.params.reviewId;
        const reviewInfo = req.body;
        const response = await ReviewService.editReviewProductByUser(user_id, product_id, review_id, reviewInfo);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const deleteReviewProductByUser = async (req, res) => {
    try {
        const user_id = req.params.userId;
        const product_id = req.params.productId;
        const review_id = req.params.reviewId;
        const response = await ReviewService.deleteReviewProductByUser(user_id, review_id, product_id);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

/** Sản phẩm đã mua nhưng chưa đánh giá **/
export const fetchListUnreviewPurchaseUser = async (req, res) => {
    try {
        const user_id = req.params.userId;
        const response = await ReviewService.fetchListUnreviewPurchaseUser(user_id);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const fetchListReviewedPurchaseUser = async (req, res) => {
    try {
        const user_id = req.params.userId;
        const response = await ReviewService.fetchListReviewedPurchaseUser(user_id);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}