import * as shopServices from "../services/shop.service";

export const fetchAllProductsInShop = async (req, res) => {
    try {
        const shopId = req.params.id;
        const response = await shopServices.fetchAllProductsInShop(shopId);
        return res.status(200).json(response);
    } catch (error) {
        return res.status(error.status).json({
            status: error.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const fetchAllShop = async (req, res) => {
    try {
        const response = await shopServices.fetchAllShop();
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const fetchListShopNotPending = async (req, res) => {
    try {
        const response = await shopServices.fetchListShopNotPending();
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const fetchRegisterShops = async (req, res) => {
    try {
        const response = await shopServices.fetchRegisterShops();
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const fetchShopById = async (req, res) => {
    try {
        const shopId = req.params.id;
        const response = await shopServices.fetchShopById(shopId);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const fetchShopByTokenId = async (req, res) => {
    try {
        const { shopId } = req.user;
        const response = await shopServices.fetchShopByTokenId(shopId);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const fetchListLatestOrderShop = async (req, res) => {
    try {
        const { shopId } = req.user;
        const response = await shopServices.fetchListLatestOrderShop(
            shopId,
            req.body
        );
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const createNewShop = async (req, res) => {
    try {
        const userInfo = req.body.userInfo;
        const shopInfo = req.body.shopInfo;
        const files = req.files;
        const response = await shopServices.createNewShop(userInfo, shopInfo, files);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error.status).json({
            status: error.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        })
    }
}

export const updateShopById = async (req, res) => {
    try {
        const shopId = req.params.id;
        const response = await shopServices.updateShopById(
            shopId,
            req.body.shopInfo,
            req.files
        );
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error.status).json({
            status: error.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        })
    }
}

export const deleteShopById = async (req, res) => {
    try {
        const shopId = req.params.id;
        const response = await shopServices.deleteShopById(shopId);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const declineRegisterShopById = async (req, res) => {
    try {
        const shopId = req.params.id;
        const response = await shopServices.declineRegisterShopById(shopId);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const acceptRegisterShopById = async (req, res) => {
    try {
        const shopId = req.params.id;
        const response = await shopServices.acceptRegisterShopById(shopId);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

/** MOBILE */
export const fetchPopularProductsByShop = async (req, res) => {
    try {
        const shopId = req.params.id;
        const page = parseInt(req.query.page) || 10;
        const limit = parseInt(req.query.limit) || 1;
        const response = await shopServices.fetchPopularProductsByShop(shopId, page, limit);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const fetchLatestProductsByShop = async (req, res) => {
    try {
        const shopId = req.params.id;
        const page = parseInt(req.query.page) || 10;
        const limit = parseInt(req.query.limit) || 1;
        const response = await shopServices.fetchLatestProductsByShop(shopId, page, limit);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const fetchPriceProductsByShop = async (req, res) => {
    try {
        const shopId = req.params.id;
        const page = parseInt(req.query.page) || 10;
        const limit = parseInt(req.query.limit) || 1;
        const sort = req.query.sort;
        const response = await shopServices.fetchPriceProductsByShop(shopId, page, limit, sort);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const fetchParentCategoriesWithTotalProductByShop = async (req, res) => {
    try {
        const shopId = req.params.id;
        const response = await shopServices.fetchParentCategoriesWithTotalProductByShop(shopId);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const fetchProductsByParentCategoryInShop = async (req, res) => {
    try {
        const shopId = req.params.id;
        const parent_category_id = req.params.categoryId;
        const page = parseInt(req.query.page);
        const limit = parseInt(req.query.limit);
        const response = await shopServices.fetchProductsByParentCategoryInShop(
            shopId,
            parent_category_id,
            page,
            limit
        );
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const withdrawalMoneyByOwner = async (req, res) => {
    try {
        const { id: userId, shopId: tokenShopId } = req.user;
        const { shop_id, amount, password } = req.body;
        const response = await shopServices.withdrawalMoneyByOwner(
            userId,
            tokenShopId,
            { shopId: shop_id, amount: amount, password: password }
        );
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const fetchListWithdrawalHistories = async (req, res) => {
    try {
        const { shopId: tokenShopId } = req.user;
        const response = await shopServices.fetchListWithdrawalHistories(tokenShopId);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const fetchBalanceShop = async (req, res) => {
    try {
        const { shopId: tokenShopId, id: tokenUserId } = req.user;
        const response = await shopServices.fetchBalanceShop(tokenUserId, tokenShopId);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

