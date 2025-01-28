import productServices from "../services/product.service";

const fetchProductMobileById = async (req, res) => {
    try {
        const productId = req.params.id;
        const response = await productServices.fetchProductMobileById(productId);
        return res.status(response?.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

const fetchProductById = async (req, res) => {
    try {
        const productId = req.params.id;
        const response = await productServices.fetchProductById(productId);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        })
    }
}

const fetchAllProduct = async (req, res) => {
    try {
        const shopId = req.query.shopId;
        const response = await productServices.fetchAllProduct(shopId);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

const createNewProduct = async (req, res) => {
    try {
        const shopId = req.query.shopId;
        const response = await productServices.createNewProduct(req.body, req.files, shopId);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

const updateProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const response = await productServices.updateProduct(productId, req.body, req.files);
        return res.status(200).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

module.exports = {
    fetchProductMobileById: fetchProductMobileById,
    fetchProductById: fetchProductById,
    fetchAllProduct: fetchAllProduct,
    createNewProduct: createNewProduct,
    updateProduct: updateProduct
}