import express from "express";
import { checkUserAuthentication, checkUserAuthenticationMobile } from "../common/middleware/jwt.middleware";
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

/** Danh sách coupon (Có cả người dùng) */
CouponRouter.get(
    '/coupon/shop/:shopId/mobile',
    checkUserAuthenticationMobile,
    CouponController.fetchShopCouponMobile
)

CouponRouter.get(
    '/coupon/shop/:shopId/only/mobile',
    CouponController.fetchShopCouponOnlyMobile
)

CouponRouter.get(
    '/coupon/user/mobile',
    checkUserAuthenticationMobile,
    CouponController.fetchCouponUserMobile
)

CouponRouter.post(
    '/coupon/:couponId/mobile',
    checkUserAuthenticationMobile,
    CouponController.saveCouponMobile
)


export default CouponRouter;