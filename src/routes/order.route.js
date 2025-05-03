import express from "express";
import { checkUserAuthentication, checkUserAuthenticationMobile } from "../common/middleware/jwt.middleware";
import * as OrderController from "../data/controllers/order.controller";

const OrderRouter = express.Router();

/** Tạo Order Mobile **/
OrderRouter.post(
    '/order/mobile',
    checkUserAuthenticationMobile,
    OrderController.createOrderMobile
)

/** List Order User **/
OrderRouter.get(
    '/order/user/:userId/mobile',
    OrderController.fetchListOrderUser
)

/** Cancel Order **/
OrderRouter.post(
    '/order/cancel/:orderId/mobile',
    checkUserAuthenticationMobile,
    OrderController.cancelOrderUser
)
export default OrderRouter;