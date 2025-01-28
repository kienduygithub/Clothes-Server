import HttpErrors from "../../common/errors/http-errors";
import { ResponseModel } from "../../common/errors/response";
import { handleDeleteImages } from "../../common/middleware/upload.middleware";
import db from "../models";

const fetchProductMobileById = async (productId) => {
    try {
        if (!productId) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu trường cần thiết');
        }

        const response = await db.Product.findOne({
            where: { id: productId },
            attributes: {
                exclude: ['createdAt', 'updatedAt']
            },
            include: [
                {
                    model: db.Shop,
                    as: 'shop',
                    attributes: [
                        'id', 'shop_name', 'logo_url'
                    ],
                    include: {
                        model: db.Product,
                        as: 'products',
                        attributes: ['id', 'product_name'],
                        include: {
                            model: db.Review,
                            as: 'reviews',
                            attributes: ['id', 'rating']
                        }
                    }
                },
                {
                    model: db.Review,
                    as: 'reviews',
                    attributes: ['id', 'rating', 'comment', 'createdAt'],
                    include: {
                        model: db.User,
                        as: 'user_review',
                        attributes: ['id', 'name', 'image_url']
                    }
                }
            ]
        });
        const payload = {
            product: response
        };
        return ResponseModel.success('Chi tiết sản phẩm.', payload);
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

const fetchProductById = async (productId) => {
    try {
        if (!productId) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu trường cần thiết', null);
        }
        const product = await db.Product.findOne({
            where: { id: productId },
            attributes: { exclude: ['updatedAt'] },
            include: [
                {
                    model: db.ProductImages,
                    as: 'product_images',
                    attributes: { exclude: ['createdAt', 'updatedAt'] }
                }
            ]
        });

        if (!product) {
            ResponseModel.error(HttpErrors.NOT_FOUND, 'Không tìm thấy sản phẩm.', []);
        }

        const payload = {
            products: [product]
        };
        return ResponseModel.success('Tìm thấy sản phẩm', payload);
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

const fetchAllProduct = async (shopId) => {
    try {
        if (!shopId) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu trường cần thiết', null);
        }

        const products = await db.Product.findAll({
            where: { shopId: shopId },
            attributes: {
                exclude: ['updatedAt']
            },
            include: [
                {
                    model: db.ProductImages,
                    as: 'product_images',
                    attributes: {
                        exclude: ['createdAt', 'updatedAt']
                    }
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        const payload = {
            products: products
        };
        return ResponseModel.success('Danh sách sản phẩm.', payload);
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

const createNewProduct = async (data, files, shopId) => {
    try {
        const uploadImages = [];
        const {
            product_name,
            origin,
            description,
            unit_price
        } = JSON.parse(data.basicInfo);

        if (!shopId) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu trường cần thiết', null);
        } else if (isNaN(unit_price)) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Giá thành sai kiểu dữ liệu', null);
        }

        const existShop = await db.Shop.findOne({
            where: { id: shopId }
        });

        if (!existShop) {
            ResponseModel.error(HttpErrors.NOT_FOUND, 'Không tìm thấy cửa hàng yêu cầu.', null);
        }

        const product = await db.Product.create({
            shopId: shopId,
            product_name: product_name,
            origin: origin,
            description: description,
            unit_price: Number(unit_price)
        });

        const imageFiles = files;
        if (imageFiles && imageFiles.length > 0) {
            const newImages = imageFiles.map((file) => ({
                productId: product.id,
                image_url: `products/${file.filename}`
            }));
            uploadImages.push(...newImages);
        };

        if (uploadImages.length > 0) {
            await db.ProductImages.bulkCreate(uploadImages);
        }

        return ResponseModel.success('Sản phẩm tạo thành công');
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

const updateProduct = async (productId, data, files) => {
    try {
        const {
            shopId,
            product_name,
            origin,
            description,
            unit_price,
            image_urls
        } = JSON.parse(data.basicInfo);
        if (!shopId || !productId || isNaN(unit_price) || !image_urls) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu trường cần thiết', null);
        }

        const existShop = await db.Shop.findOne({ where: { id: shopId } });
        if (!existShop) {
            ResponseModel.error(HttpErrors.NOT_FOUND, 'Không tìm thấy cửa hàng.', null);
        }

        const product = await db.Product.findOne({
            where: { id: productId },
            include: {
                model: db.ProductImages,
                as: 'product_images',
                attributes: { exclude: ['createdAt', 'updatedAt'] }
            },
            attributes: { exclude: ['updatedAt'] }
        });
        if (!product) {
            ResponseModel.error(HttpErrors.NOT_FOUND, 'Không tìm thấy sản phẩm.', null);
        }

        if (product_name !== undefined) {
            product.product_name = product_name;
        }
        product.origin = origin;
        product.description = description;
        product.unit_price = Number(unit_price);

        await product.save();

        const oldImages = product.product_images;
        const deletedImages = oldImages.filter(
            item => !image_urls.some(i => i.image_url.includes(item.image_url))
        );
        await db.ProductImages.destroy({
            where: { id: deletedImages.map(i => i.id) }
        })
        await handleDeleteImages(deletedImages.map(item => item.image_url));

        // Tải ảnh mới
        const uploadImages = [];
        const imageFiles = files;
        if (imageFiles && imageFiles.length > 0) {
            const newImages = imageFiles.map((file) => ({
                productId: product.id,
                image_url: `products/${file.filename}`
            }));
            uploadImages.push(...newImages);
        };

        if (uploadImages.length > 0) {
            await db.ProductImages.bulkCreate(uploadImages);
        }

        return ResponseModel.success('Cập nhật thành công', null);
    } catch (error) {
        console.log(error);
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

module.exports = {
    fetchProductMobileById: fetchProductMobileById,
    fetchProductById: fetchProductById,
    fetchAllProduct: fetchAllProduct,
    createNewProduct: createNewProduct,
    updateProduct: updateProduct
}