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

export const createNewShop = async (req, res) => {
    try {
        const shopInfo = req.body.shopInfo;
        const files = req.files;
        const response = await shopServices.createNewShop(shopInfo, files);
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