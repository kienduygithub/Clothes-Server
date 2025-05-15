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

OrderRouter.patch(
    '/order/shop',
    OrderController.updateStatusOrder
)

OrderRouter.get(
    '/order/shop/detail',
    OrderController.fetchOrderShopDetail
)

OrderRouter.get(
    '/admin/order/list',
    OrderController.fetchListOrderForAdmin
)

OrderRouter.post(
    '/overview/stats',
    checkUserAuthentication,
    OrderController.fetchShopOverview
)

OrderRouter.post(
    '/overview/stats/by-period',
    checkUserAuthentication,
    OrderController.fetchRevenueOverTime
)

OrderRouter.post(
    '/overview/stats/order/by-status-or-period',
    checkUserAuthentication,
    OrderController.fetchOrderStats
)

OrderRouter.post(
    '/overview/stats/product/top-selling',
    checkUserAuthentication,
    OrderController.fetchTopSellingProducts
)

OrderRouter.post(
    '/overview/stats/customer/total-and-top-rank',
    checkUserAuthentication,
    OrderController.fetchCustomerStats
)

OrderRouter.post(
    '/overview/stats/product/low-stock',
    checkUserAuthentication,
    OrderController.fetchLowStockProducts
)

OrderRouter.post(
    '/overview/stats/order/completion-rate',
    checkUserAuthentication,
    OrderController.fetchOrderCompletionStats
)

export default OrderRouter;