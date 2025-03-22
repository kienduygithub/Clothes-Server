import express from "express";
import { checkUserAuthentication } from "../common/middleware/jwt.middleware";
import * as CouponController from "../data/controllers/coupon.controller";
const CouponRouter = express.Router();

CouponRouter.get(
    '/owner/coupon/:couponId',
    // checkUserAuthentication,
    CouponController.fetchCouponById
);

CouponRouter.get(
    '/owner/coupon/:shopId/shop',
    // checkUserAuthentication,
    CouponController.fetchShopCoupons
);

CouponRouter.post(
    '/owner/coupon/:shopId',
    // checkUserAuthentication,
    CouponController.addNewCoupon
);

CouponRouter.put(
    '/owner/coupon/:couponId/used/:userId',
    // checkUserAuthentication,
    CouponController.updateTimesUsedCouponById
)

CouponRouter.put(
    '/owner/coupon/:id',
    // checkUserAuthentication,
);

CouponRouter.delete(
    '/owner/coupon/:id',
    // checkUserAuthentication,
);



export default CouponRouter;