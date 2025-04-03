import express from "express";
import * as CartController from "../data/controllers/cart.controller";
import { checkUserAuthenticationMobile } from "../common/middleware/jwt.middleware";

const CartRouter = express.Router();

/** Lấy chi tiết giỏ hàng */
CartRouter.get(
    '/cart/:cartId',
    checkUserAuthenticationMobile,
    CartController.getCartByUser
)

/** Thêm một sản phẩm */
CartRouter.post(
    '/cart/:cardId/add',
    checkUserAuthenticationMobile,
    CartController.addCartItem
)

/** Xóa một sản phẩm */
CartRouter.delete(
    '/cart/:cartId/item/:itemId',
    checkUserAuthenticationMobile,
)

/** Xóa một cart shop */
CartRouter.delete(
    '/cart/:cartId/cart-shop/:cartShopId',
    checkUserAuthenticationMobile,
)

/** Thay đối số lượng sản phẩm */
CartRouter.put(
    '/cart/:cartId/item/:itemId',
    checkUserAuthenticationMobile,
)

/** Thanh toán giỏ hàng */
CartRouter.post(
    '/cart/:cartId/payment',
    checkUserAuthenticationMobile,
)

export default CartRouter;