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

/** ADMIN - OWNER **/
OrderRouter.get(
    '/order/shop',
    checkUserAuthentication,
    OrderController.fetchListShopOrder
)

OrderRouter.get(
    '/overview/stats',
    checkUserAuthentication,
    OrderController.fetchShopOverview
)

OrderRouter.get(
    '/overview/stats/by-period',
    checkUserAuthentication,
    OrderController.fetchRevenueOverTime
)

OrderRouter.get(
    '/overview/stats/order/by-status-or-period',
    checkUserAuthentication,
    OrderController.fetchOrderStats
)
export default OrderRouter;