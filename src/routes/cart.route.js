import express from "express";
import * as CartController from "../data/controllers/cart.controller";
import { checkUserAuthenticationMobile } from "../common/middleware/jwt.middleware";

const CartRouter = express.Router();

/** Lấy chi tiết giỏ hàng không check authenticate */
CartRouter.get(
    '/cart/:cartId/user/:userId',
    CartController.getCartByUserNonAuthenticate
)

/** Lấy chi tiết giỏ hàng */
CartRouter.get(
    '/cart/:cartId',
    checkUserAuthenticationMobile,
    CartController.getCartByUser
)

/** Thêm một sản phẩm */
CartRouter.post(
    '/cart/:cartId/add',
    checkUserAuthenticationMobile,
    CartController.addCartItem
)

/** Cập nhật sản phẩm thành sản phẩm khác */
CartRouter.put(
    '/cart/:cartId/item/:itemId/update',
    checkUserAuthenticationMobile,
    CartController.updateCartItem
)
/** Xóa một sản phẩm */
CartRouter.delete(
    '/cart/:cartId/item/:itemId',
    checkUserAuthenticationMobile,
    CartController.removeCartItem
)

/** Xóa một cart shop */
CartRouter.delete(
    '/cart/:cartId/cart-shop/:cartShopId',
    checkUserAuthenticationMobile,
    CartController.removeCartShop
)

/** Thay đối số lượng sản phẩm */
CartRouter.put(
    '/cart/:cartId/item/:itemId/quantity',
    checkUserAuthenticationMobile,
    CartController.updateQuantityCartItem
)

/** Áp dụng Coupon vào CartShop */
CartRouter.post(
    '/cart/cart-shop/:cartShopId/coupon/:couponId/mobile',
    checkUserAuthenticationMobile,
    CartController.applyCouponCartShop
)

/** Xóa Coupon đang được CartShop áp dụng */
CartRouter.put(
    '/cart/cart-shop/:cartShopId/coupon/mobile',
    checkUserAuthenticationMobile,
    CartController.removeCouponFromCartShop
)

/** Thanh toán giỏ hàng */
CartRouter.post(
    '/cart/:cartId/payment',
    checkUserAuthenticationMobile,
    CartController.paymentCart
)

export default CartRouter;