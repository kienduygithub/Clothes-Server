import express from "express";
import { checkUserAuthentication } from "../common/middleware/jwt.middleware";
import * as CouponController from "../data/controllers/coupon.controller";
const CouponRouter = express.Router();

CouponRouter.get(
    '/owner/coupon/:couponId',
    checkUserAuthentication,
    CouponController.fetchCouponById
);

CouponRouter.get(
    '/owner/coupon/:shopId/shop',
    checkUserAuthentication,
    CouponController.fetchShopCoupons
);

CouponRouter.post(
    '/owner/coupon/:shopId',
    checkUserAuthentication,
    CouponController.addNewCoupon
);

CouponRouter.put(
    '/owner/coupon/:couponId/used/:userId',
    checkUserAuthentication,
    CouponController.updateTimesUsedCouponById
)

CouponRouter.put(
    '/owner/coupon/:couponId',
    checkUserAuthentication,
    CouponController.editCoupon
);

CouponRouter.delete(
    '/owner/coupon/:couponId',
    checkUserAuthentication,
    CouponController.deleteCoupon
);



export default CouponRouter;