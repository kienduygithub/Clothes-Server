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
                },
                {
                    model: db.ProductVariant,
                    as: 'variants',
                    attributes: { exclude: ['updatedAt'] },

                },
                {
                    model: db.Category,
                    as: 'category',
                    attributes: { exclude: ['createdAt', 'updatedAt'] }
                }
            ],
            order: [
                [{ model: db.ProductVariant, as: 'variants' }, 'id', 'DESC']
            ]
        });

        if (!product) {
            ResponseModel.error(HttpErrors.NOT_FOUND, 'Không tìm thấy sản phẩm.', []);
        }

        // const categories = await product.getCategories();

        const payload = {
            products: [product],
            //categorys: categories
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
                },
                {
                    model: db.ProductVariant,
                    as: 'variants',
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
            gender,
            description,
            unit_price,
            variants,
            categoryId
        } = JSON.parse(data.basicInfo);

        if (!shopId || !variants || !categoryId) {
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
            gender: gender,
            description: description,
            unit_price: Number(unit_price),
            categoryId: categoryId
        });

        const imageFiles = files['infoImages'];
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

        const newProductVariants = [];
        const variantImages = files['variantImages'];
        if (variantImages && variantImages.length > 0) {
            const temp = variantImages.map((file, index) => ({
                productId: product.id,
                colorId: Number(variants[index].colorId),
                sizeId: Number(variants[index].sizeId),
                image_url: `product_variants/${file.filename}`,
                sku: variants[index].sku,
                stock_quantity: variants[index].stock_quantity
            })).reverse();
            newProductVariants.push(...temp);
        }
        if (newProductVariants.length > 0) {
            await db.ProductVariant.bulkCreate(newProductVariants);
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
            gender,
            description,
            unit_price,
            image_urls,
            variants,
            categoryId
        } = JSON.parse(data.basicInfo);
        if (!shopId || !productId || !variants || !image_urls || !categoryId) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu trường cần thiết', {
                shopId,
                productId,
                variants,
                image_urls,
                categoryId
            });
        } else if (isNaN(unit_price)) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Giá thành sai kiểu dữ liệu', null);
        }

        const existShop = await db.Shop.findOne({ where: { id: shopId } });
        if (!existShop) {
            ResponseModel.error(HttpErrors.NOT_FOUND, 'Không tìm thấy cửa hàng.', null);
        }

        const product = await db.Product.findOne({
            where: { id: productId },
            include: [
                {
                    model: db.ProductImages,
                    as: 'product_images',
                    attributes: { exclude: ['createdAt', 'updatedAt'] }
                },
                {
                    model: db.ProductVariant,
                    as: 'variants',
                    attributes: { exclude: ['createdAt', 'updatedAt'] },
                }
            ],
            attributes: { exclude: ['updatedAt'] },
            order: [
                [{ model: db.ProductVariant, as: 'variants' }, 'id', 'DESC']
            ]
        });
        if (!product) {
            ResponseModel.error(HttpErrors.NOT_FOUND, 'Không tìm thấy sản phẩm.', null);
        }

        if (product_name !== undefined) {
            product.product_name = product_name;
        }
        product.origin = origin;
        product.gender = gender;
        product.description = description;
        product.unit_price = Number(unit_price);
        product.categoryId = categoryId;

        await product.save();

        const oldImages = product.product_images;
        const deletedImages = oldImages.filter(
            item => !image_urls.some(i => i.image_url.includes(item.image_url))
        );
        await db.ProductImages.destroy({
            where: { id: deletedImages.map(i => i.id) }
        })
        await handleDeleteImages(deletedImages.map(item => item.image_url));

        // Tải ảnh mới của sản phẩm (không phải biến thể)
        const uploadImages = [];
        const imageFiles = files['infoImages'];
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

        /**
         * Biến thể tạo mới luôn ở đầu danh sách cho đến hết danh sách
         * tương ứng variant image.
         * Danh sách variants: variant mới - variant cũ
         */
        const newVariantProducts = [];
        const variantImages = files['variantImages'];
        if (variantImages && variantImages.length > 0) {
            const temp = variantImages.map((file, index) => ({
                productId: product.id,
                colorId: Number(variants[index].colorId),
                sizeId: Number(variants[index].sizeId),
                image_url: `product_variants/${file.filename}`,
                sku: variants[index].sku,
                stock_quantity: variants[index].stock_quantity
            })).reverse();
            newVariantProducts.push(...temp);
        }
        if (newVariantProducts.length > 0) {
            await db.ProductVariant.bulkCreate(newVariantProducts);
        }
        const variantUpdateImages = files['variantUpdateImages'];
        const updatedIds = JSON.parse(data?.updatedIds); // ID của biến thể thay đổi ảnh
        const deletedIds = JSON.parse(data?.deletedIds);
        const variantIdsExistDatabase = product.variants.map(variant => variant.id);

        const updatedIdsSet = new Set(updatedIds);
        const deletedIdsSet = new Set(deletedIds);
        const variantIdsExistDatabaseSet = new Set(variantIdsExistDatabase);

        const listDeletedImageUrlAfterUpdated = [];

        const remainVariants = variants.filter(
            variant => variantIdsExistDatabaseSet.has(variant.id) && !deletedIdsSet.has(variant.id)
        );
        const variantUpdateFileImages = remainVariants.filter(
            variant => updatedIdsSet.has(variant.id)
        );
        const variantNotUpdateFileImages = remainVariants.filter(
            variant => !updatedIdsSet.has(variant.id)
        );
        let updatedFileVariants = variantUpdateFileImages.map((item, index) => {
            let variant = {};
            variant.colorId = item.colorId;
            variant.sizeId = item.sizeId;
            variant.stock_quantity = item.stock_quantity;
            const file = variantUpdateImages[index];
            if (file) {
                const deletedImageUrl = product.variants.find(v => v.id === item.id)?.image_url;
                if (deletedImageUrl) {
                    listDeletedImageUrlAfterUpdated.push(deletedImageUrl);
                }
                variant.image_url = `product_variants/${file.filename}`
            }
            return db.ProductVariant.update(
                variant, { where: { id: item.id } }
            )
        });
        let updatedNotFileVariants = variantNotUpdateFileImages.map((item) => {
            let variant = {};
            variant.colorId = item.colorId;
            variant.sizeId = item.sizeId;
            variant.stock_quantity = item.stock_quantity;
            return db.ProductVariant.update(variant, {
                where: { id: item.id }
            });
        }).filter(Boolean);
        await Promise.all([...updatedFileVariants, ...updatedNotFileVariants]);
        /**
         * Cập nhật xong biến thể mới và cũ thì đến lượt biến thể xóa
         */
        if (deletedIds.length > 0) {
            await db.ProductVariant.destroy({
                where: { id: deletedIds }
            });
            const deletedImages = product.variants
                .filter(v => deletedIdsSet.has(v.id))
                .map(v => v.image_url);
            listDeletedImageUrlAfterUpdated.push(...deletedImages);
        }

        if (listDeletedImageUrlAfterUpdated.length > 0) {
            await handleDeleteImages(listDeletedImageUrlAfterUpdated);
        }

        return ResponseModel.success('Cập nhật thành công', null);
    } catch (error) {
        console.log(error);
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

const deleteProductById = async (productId) => {
    try {
        if (!productId) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu trường cần thiết.', null);
        }

        const existProduct = await db.Product.findOne({
            where: { id: productId },
            include: [
                {
                    model: db.ProductImages,
                    as: 'product_images'
                },
                {
                    model: db.ProductVariant,
                    as: 'variants'
                }
            ]
        });

        if (!existProduct) {
            ResponseModel.error(HttpErrors.NOT_FOUND, 'Không tìm thấy sản phẩm.', null);
        }

        await db.Product.destroy({
            where: { id: productId }
        });

        const infoImages = existProduct.product_images.map(
            product => product.image_url
        ).filter(url => url !== undefined);
        const variantImages = existProduct.variants.map(
            variant => variant.image_url
        ).filter(url => url !== undefined);

        await handleDeleteImages(infoImages);
        await handleDeleteImages(variantImages);

        return ResponseModel.success('Xóa sản phẩm thành công.', null);
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

module.exports = {
    fetchProductMobileById: fetchProductMobileById,
    fetchProductById: fetchProductById,
    fetchAllProduct: fetchAllProduct,
    createNewProduct: createNewProduct,
    updateProduct: updateProduct,
    deleteProductById: deleteProductById
}