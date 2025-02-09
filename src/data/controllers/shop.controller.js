import shopServices from "../services/shop.service";

const fetchAllProductsInShop = async (req, res) => {
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

const fetchAllShop = async (req, res) => {
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

const createNewShop = async (req, res) => {
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

const updateShopById = async (req, res) => {
    try {
        const shopId = req.params.id;
        const response = await shopServices.updateShopById(shopId, req.body);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error.status).json({
            status: error.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        })
    }
}

const deleteShopById = async (req, res) => {
    try {
        const shopId = req.query.id;
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

module.exports = {
    fetchAllProductsInShop: fetchAllProductsInShop,
    fetchAllShop: fetchAllShop,
    createNewShop: createNewShop,
    updateShopById: updateShopById,
    deleteShopById: deleteShopById
}