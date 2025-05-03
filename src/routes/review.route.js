import express from "express";
import { checkUserAuthenticationMobile } from "../common/middleware/jwt.middleware";
import * as ReviewController from "../data/controllers/review.controller";

const ReviewRouter = express.Router();

/** MOBILE */
ReviewRouter.get(
    '/review/user/:userId/product/unreview',
    ReviewController.fetchListUnreviewPurchaseUser
)

ReviewRouter.get(
    '/review/user/:userId/product/reviewed',
    ReviewController.fetchListReviewedPurchaseUser
)

ReviewRouter.post(
    '/review/product/reviewed',
    checkUserAuthenticationMobile,
    ReviewController.addReviewPurchaseUser
)


ReviewRouter.get(
    '/reviews/product/:productId',
    ReviewController.fetchReviewsByProduct
);

ReviewRouter.get(
    '/reviews/product/:productId/user/:userId/review/:reviewId',
    ReviewController.fetchReviewById
);

ReviewRouter.post(
    '/reviews/product/:productId/user/:userId',
    checkUserAuthenticationMobile,
    ReviewController.reviewProductByUser
);

ReviewRouter.put(
    '/reviews/product/:productId/user/:userId/review/:reviewId',
    checkUserAuthenticationMobile,
    ReviewController.editReviewProductByUser
);

ReviewRouter.delete(
    '/reviews/product/:productId/user/:userId/review/:reviewId',
    checkUserAuthenticationMobile,
    ReviewController.deleteReviewProductByUser
);



export default ReviewRouter;