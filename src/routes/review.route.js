import express from "express";
import { checkUserAuthentication } from "../common/middleware/jwt.middleware";
import * as ReviewController from "../data/controllers/review.controller";

const ReviewRouter = express.Router();

ReviewRouter.get(
    '/reviews/product/:productId',
    ReviewController.fetchReviewsByProduct
);

ReviewRouter.post(
    '/reviews/product/:productId/user/:userId',
    // checkUserAuthentication,
    ReviewController.reviewProductByUser
);

ReviewRouter.put(
    '/reviews/product/:productId/user/:userId/review/:reviewId',
    // checkUserAuthentication,
    ReviewController.editReviewProductByUser
);

ReviewRouter.delete(
    '/reviews/user/:userId/review/:reviewId',
    // checkUserAuthentication,
    ReviewController.deleteReviewProductByUser
);



export default ReviewRouter;