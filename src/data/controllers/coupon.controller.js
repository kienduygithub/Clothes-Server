import HttpErrors from "../../common/errors/http-errors";
import * as CouponService from "../services/coupon.service";

export const fetchShopCoupons = async (req, res) => {
    try {
        const shopId = req.params.shopId;
        const response = await CouponService.fetchShopCoupons(shopId);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status || HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        })
    }
}

export const fetchCouponById = async (req, res) => {
    try {
        const coupon_id = req.params.couponId;
        const response = await CouponService.fetchCouponById(coupon_id);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status || HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const addNewCoupon = async (req, res) => {
    try {
        const shop_id = req.params.shopId;
        const couponInfo = req.body;
        const response = await CouponService.addNewCoupon(shop_id, couponInfo);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status || HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const updateTimesUsedCouponById = async (req, res) => {
    try {
        const user_id = req.params.userId;
        const coupon_id = req.params.couponId;
        const response = await CouponService.updateTimesUsedCouponById(user_id, coupon_id);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status || HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        })
    }
}

export const editCoupon = async (req, res) => {
    try {
        const coupon_id = req.params.couponId;
        const couponInfo = req.body;
        const response = await CouponService.editCoupon(coupon_id, couponInfo);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status || HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        })
    }
}

export const deleteCoupon = async (req, res) => {
    try {
        const coupon_id = req.params.couponId;
        const response = await CouponService.deleteCoupon(coupon_id);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status || HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        })
    }
}

/** MOBILE **/
export const fetchShopCouponMobile = async (req, res) => {
    try {
        const user_id = req.user.id;
        const shop_id = req.params.shopId;
        const response = await CouponService.fetchShopCouponMobile(user_id, shop_id);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status || HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        })
    }
}

export const fetchShopCouponOnlyMobile = async (req, res) => {
    try {
        const shop_id = req.params.shopId;
        const response = await CouponService.fetchShopCouponOnlyMobile(shop_id);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status || HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        })
    }
}

export const fetchCouponUserMobile = async (req, res) => {
    try {
        const userId = req.user.id;
        const response = await CouponService.fetchCouponUserMobile(userId);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status || HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        })
    }
}

export const saveCouponMobile = async (req, res) => {
    try {
        const user_id = req.user.id;
        const coupon_id = req.params.couponId;
        const response = await CouponService.saveCouponMobile(user_id, coupon_id);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status || HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        })
    }
}