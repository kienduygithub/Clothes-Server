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

export const fetchProductVariantMobileByProductId = async (req, res) => {
    try {
        const productId = req.params.id;
        const response = await productServices.fetchProductVariantMobileByProductId(productId);
        return res.status(response?.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const fetchLatestProduct = async (req, res) => {
    try {
        const response = await productServices.fetchLatestProduct();
        return res.status(response?.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const fetchProductMobilesByShopId = async (req, res) => {
    try {
        const shop_id = req.params.shopId;
        const response = await productServices.fetchProductMobilesByShopId(shop_id);
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

export const fetchListRelativeProductInShop = async (req, res) => {
    try {
        const { shopId, productId } = req.params;
        const response = await productServices.fetchListRelativeProductInShop(shopId, productId);
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

/** MOBILE */
export const searchAndFilterProductsMobile = async (req, res) => {
    try {
        const {
            search = '',
            page = '1',
            limit = '10',
            origins = '', /** Chuỗi cách nhau bởi dấu phẩy, Example: "Nước Mỹ,Việt Name" */
            categoryId = null,
            sortPrice = 'ASC',
            minPrice = '0',
            maxPrice = 'Infinity',
            minRatings = '', /** Chuỗi cách nhau bởi dấu phẩy, Example: "4,5" */
        } = req.query;
        const parseIntPage = parseInt(page);
        const parseIntLimit = parseInt(limit);
        const parseOrigins = origins ? origins.split(',').map(origin => origin.trim()) : [];
        const parseCategoryId = categoryId ? parseInt(categoryId) : null;
        const parseSortPrice = ['ASC', 'DESC'].includes(sortPrice.toUpperCase()) ? sortPrice.toUpperCase() : 'ASC';
        const parseMinPrice = parseFloat(minPrice) || 0;
        const parseMaxPrice = maxPrice === 'Infinity' || !maxPrice ? Infinity : parseFloat(maxPrice);
        const parseMinRatings = minRatings
            ? minRatings.split(',').map(item => parseInt(item.trim())).filter(r => [1, 2, 3, 4, 5].includes(r))
            : [];

        const response = await productServices.searchAndFilterProductsMobile(
            search,
            parseIntPage,
            parseIntLimit,
            parseOrigins,
            parseCategoryId,
            parseSortPrice,
            parseMinPrice,
            parseMaxPrice,
            parseMinRatings
        );

        return res.status(response?.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status,
            message: error?.message || 'UNKNOWN',
            body: error?.body
        })
    }
}

export const searchAndFilterProductShopMobile = async (req, res) => {
    try {
        const shop_id = req.params.shopId;
        const {
            search = '',
            page = '1',
            limit = '10',
            origins = '', /** Chuỗi cách nhau bởi dấu phẩy, Example: "Nước Mỹ,Việt Name" */
            categoryId = null,
            sortPrice = 'ASC',
            minPrice = '0',
            maxPrice = 'Infinity',
            minRatings = '', /** Chuỗi cách nhau bởi dấu phẩy, Example: "4,5" */
        } = req.query;
        const parseIntPage = parseInt(page);
        const parseIntLimit = parseInt(limit);
        const parseOrigins = origins ? origins.split(',').map(origin => origin.trim()) : [];
        const parseCategoryId = categoryId ? parseInt(categoryId) : null;
        const parseSortPrice = ['ASC', 'DESC'].includes(sortPrice.toUpperCase()) ? sortPrice.toUpperCase() : 'ASC';
        const parseMinPrice = parseFloat(minPrice) || 0;
        const parseMaxPrice = maxPrice === 'Infinity' || !maxPrice ? Infinity : parseFloat(maxPrice);
        const parseMinRatings = minRatings
            ? minRatings.split(',').map(item => parseInt(item.trim())).filter(r => [1, 2, 3, 4, 5].includes(r))
            : [];

        const response = await productServices.searchAndFilterProductShopMobile(
            search,
            parseIntPage,
            parseIntLimit,
            parseOrigins,
            parseCategoryId,
            parseSortPrice,
            parseMinPrice,
            parseMaxPrice,
            parseMinRatings,
            parseInt(shop_id)
        );

        return res.status(response?.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status,
            message: error?.message || 'UNKNOWN',
            body: error?.body
        })
    }
}

export const searchAndFilterProductsByParentCategoryMobile = async (req, res) => {
    try {
        const parent_category_id = req.params.categoryId;

        const {
            search = '',
            page = '1',
            limit = '10',
            origins = '',
            sortPrice = 'ASC',
            minPrice = '0',
            maxPrice = 'Infinity',
            minRatings = '',
        } = req.query;
        const parseIntPage = parseInt(page);
        const parseIntLimit = parseInt(limit);
        const parseOrigins = origins ? origins.split(',').map(origin => origin.trim()) : [];
        const parseSortPrice = ['ASC', 'DESC'].includes(sortPrice.toUpperCase()) ? sortPrice.toUpperCase() : 'ASC';
        const parseMinPrice = parseFloat(minPrice) || 0;
        const parseMaxPrice = maxPrice === 'Infinity' || !maxPrice ? Infinity : parseFloat(maxPrice);
        const parseMinRatings = minRatings
            ? minRatings.split(',').map(item => parseInt(item.trim())).filter(r => [1, 2, 3, 4, 5].includes(r))
            : [];

        const response = await productServices.searchAndFilterProductsByParentCategoryMobile(
            parent_category_id,
            search,
            parseIntPage,
            parseIntLimit,
            parseOrigins,
            parseSortPrice,
            parseMinPrice,
            parseMaxPrice,
            parseMinRatings,
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

export const searchAndFilterLatestProductsMobile = async (req, res) => {
    try {
        const {
            search = '',
            page = '1',
            limit = '10',
            origins = '', /** Chuỗi cách nhau bởi dấu phẩy, Example: "Nước Mỹ,Việt Name" */
            categoryId = null,
            sortPrice = 'ASC',
            minPrice = '0',
            maxPrice = 'Infinity',
            minRatings = '', /** Chuỗi cách nhau bởi dấu phẩy, Example: "4,5" */
        } = req.query;
        const parseIntPage = parseInt(page);
        const parseIntLimit = parseInt(limit);
        const parseOrigins = origins ? origins.split(',').map(origin => origin.trim()) : [];
        const parseCategoryId = categoryId ? parseInt(categoryId) : null;
        const parseSortPrice = ['ASC', 'DESC'].includes(sortPrice.toUpperCase()) ? sortPrice.toUpperCase() : 'ASC';
        const parseMinPrice = parseFloat(minPrice) || 0;
        const parseMaxPrice = maxPrice === 'Infinity' || !maxPrice ? Infinity : parseFloat(maxPrice);
        const parseMinRatings = minRatings
            ? minRatings.split(',').map(item => parseInt(item.trim())).filter(r => [1, 2, 3, 4, 5].includes(r))
            : [];

        const response = await productServices.searchAndFilterLatestProductsMobile(
            search,
            parseIntPage,
            parseIntLimit,
            parseOrigins,
            parseCategoryId,
            parseSortPrice,
            parseMinPrice,
            parseMaxPrice,
            parseMinRatings
        );

        return res.status(response?.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status,
            message: error?.message || 'UNKNOWN',
            body: error?.body
        })
    }
}