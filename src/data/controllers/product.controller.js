import * as productServices from "../services/product.service";

export const fetchProductMobileById = async (req, res) => {
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

export const fetchProductMobiles = async (req, res) => {
    try {
        const response = await productServices.fetchProductMobiles();
        return res.status(response?.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const fetchProductById = async (req, res) => {
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

export const fetchAllProduct = async (req, res) => {
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

export const createNewProduct = async (req, res) => {
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

export const updateProduct = async (req, res) => {
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

export const deleteProductById = async (req, res) => {
    try {
        const productId = req.params.id;
        const response = await productServices.deleteProductById(productId);
        return res.status(response?.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status,
            message: error?.message || 'UNKNOWN',
            body: error?.body
        })
    }
}