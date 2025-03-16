import express from "express";
import { checkUserAuthentication } from "../common/middleware/jwt.middleware";

const CouponRouter = express.Router();

CouponRouter.get(
    '/coupon/:id',
    // checkUserAuthentication,
);

CouponRouter.get(
    '/coupon/:shopId/shop',
    // checkUserAuthentication,
);

CouponRouter.post(
    '/coupon/:shopId/shop',
    // checkUserAuthentication,
);

CouponRouter.put(
    '/coupon/:id',
    // checkUserAuthentication,
);

CouponRouter.delete(
    '/coupon/:id',
    // checkUserAuthentication,
);



export default CouponRouter;