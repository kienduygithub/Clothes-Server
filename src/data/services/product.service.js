import { Op } from "sequelize";
import HttpErrors from "../../common/errors/http-errors";
import { ResponseModel } from "../../common/errors/response";
import { handleDeleteImages } from "../../common/middleware/upload.middleware";
import db, { sequelize } from "../models";

export const fetchProductMobileById = async (productId) => {
    const t = await sequelize.transaction();
    try {
        if (!productId) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu trường cần thiết');
        }

        const response = await db.Product.findOne({
            where: { id: productId },
            transaction: t,
            attributes: {
                exclude: ['createdAt', 'updatedAt'],
                include: [
                    [sequelize.fn('AVG', sequelize.col('reviews.rating')), 'rating']
                ]
            },
            include: [
                {
                    model: db.Shop,
                    as: 'shop',
                    attributes: ['id', 'shop_name', 'logo_url', 'contact_address'],
                    include: [
                        {
                            model: db.User,
                            as: 'user',
                            attributes: ['id', 'name']
                        }
                    ]
                },
                {
                    model: db.Category,
                    as: 'category',
                    attributes: ['id', 'category_name'],
                    include: {
                        model: db.Category,
                        as: 'parent',
                        attributes: ['id', 'category_name']
                    }
                },
                {
                    model: db.Review,
                    as: 'reviews',
                    attributes: []
                },
                {
                    model: db.ProductImages,
                    as: 'product_images',
                    attributes: ['id', 'image_url']
                }
            ],
            group: ['product_images.id']
        });

        response.shop.ownerId = response.shop.user.id;

        const payload = {
            products: [response]
        };

        await t.commit();

        return ResponseModel.success('Chi tiết sản phẩm.', payload);
    } catch (error) {
        await t.rollback();
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const fetchProductVariantMobileByProductId = async (product_id) => {
    const t = await sequelize.transaction();
    try {
        if (!product_id) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                product_id: product_id ?? ''
            });
        }

        const variants = await db.ProductVariant.findAll({
            where: { productId: product_id },
            transaction: t,
            attributes: { exclude: ['createdAt', 'updatedAt'] },
            include: [
                {
                    model: db.Product,
                    as: 'product',
                    attributes: ['id', 'product_name', 'unit_price', 'sold_quantity'],
                    include: {
                        model: db.Shop,
                        as: 'shop',
                        attributes: ['id', 'shop_name']
                    }
                },
                {
                    model: db.Color,
                    as: 'color',
                    attributes: ['id', 'color_name']
                },
                {
                    model: db.Size,
                    as: 'size',
                    attributes: ['id', 'size_code']
                }
            ]
        });

        const payload = {
            variants: variants
        }

        await t.commit();

        return ResponseModel.success('Danh sách biến thể sản phẩm', payload);
    } catch (error) {
        await t.rollback();
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const fetchProductMobiles = async () => {
    const t = await sequelize.transaction();
    try {
        const products = await db.Product.findAll({
            attributes: {
                include: [
                    [sequelize.fn('AVG', sequelize.col('reviews.rating')), 'rating']
                ]
            },
            include: [
                {
                    model: db.Shop,
                    as: 'shop',
                    attributes: ['id', 'shop_name', 'logo_url']
                },
                {
                    model: db.ProductImages,
                    as: 'product_images',
                    attributes: ['id', 'image_url']
                },
                {
                    model: db.Category,
                    as: 'category',
                    attributes: ['id', 'category_name'],
                    include: {
                        model: db.Category,
                        as: 'parent',
                        attributes: ['id', 'category_name']
                    }
                },
                {
                    model: db.Review,
                    as: 'reviews',
                    attributes: []
                },
            ],
            group: ['Product.id'], // Bổ sung group theo review.id
            subQuery: false, // Ngăn việc sinh subquery gây mất dữ liệu
            transaction: t
        });

        const payload = {
            products: products
        }

        await t.commit();

        return ResponseModel.success('Danh sách Product mobile', payload);
    } catch (error) {
        await t.rollback();
        throw error;
    }
}

export const fetchListRelativeProductInShop = async (shopId, productId) => {
    const t = await sequelize.transaction();
    try {
        const subQueryRating = sequelize.literal(`(
            SELECT COALESCE(AVG(rating), 0)
            FROM Reviews
            WHERE Reviews.product_id = Product.id
        )`);

        const products = await db.Product.findAll({
            where: {
                shopId: shopId,
                id: {
                    [Op.ne]: productId
                }
            },
            attributes: [
                'id',
                'product_name',
                'unit_price',
                'sold_quantity',
                'origin',
                [subQueryRating, 'rating']
            ],
            include: [
                {
                    model: db.Shop,
                    as: 'shop',
                    attributes: ['id']
                },
                {
                    model: db.ProductImages,
                    as: 'product_images',
                    attributes: ['id', 'image_url'],
                    required: false
                },
                {
                    model: db.Review,
                    as: 'reviews',
                    attributes: [],
                    required: false
                },
            ],
            group: [
                'Product.id',
                'shop.id',
            ], // Bổ sung group theo review.id
            subQuery: false, // Ngăn việc sinh subquery gây mất dữ liệu
            transaction: t
        });

        const payload = {
            products: products
        }

        await t.commit();

        return ResponseModel.success('Danh sách Product mobile', payload);
    } catch (error) {
        await t.rollback();
        throw error;
    }
}

export const fetchLatestProduct = async () => {
    const t = await sequelize.transaction();
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const subQueryRating = sequelize.literal(`(
            SELECT COALESCE(AVG(rating), 0)
            FROM Reviews
            WHERE Reviews.product_id = Product.id
        )`);

        const products = await db.Product.findAll({
            where: {
                createdAt: {
                    [Op.gte]: startOfMonth,
                    [Op.lte]: now
                }
            },
            attributes: [
                'id',
                'product_name',
                'unit_price',
                'sold_quantity',
                'origin',
                [subQueryRating, 'rating']
            ],
            include: [
                {
                    model: db.Shop,
                    as: 'shop',
                    attributes: ['id']
                },
                {
                    model: db.ProductImages,
                    as: 'product_images',
                    attributes: ['id', 'image_url'],
                    required: false
                },
                {
                    model: db.Review,
                    as: 'reviews',
                    attributes: [],
                    required: false
                },
            ],
            group: [
                'Product.id',
                'shop.id',
            ], // Bổ sung group theo review.id
            subQuery: false, // Ngăn việc sinh subquery gây mất dữ liệu
            order: [['createdAt', 'DESC']],
            transaction: t
        });

        const payload = {
            products: products
        }

        await t.commit();

        return ResponseModel.success('Danh sách Product mobile', payload);
    } catch (error) {
        await t.rollback();
        throw error;
    }
}

export const fetchProductMobilesByShopId = async (shop_id) => {
    const t = await sequelize.transaction();
    try {
        if (!shop_id) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                shop_id: shop_id ?? ''
            });
        }

        const products = await db.Product.findAll({
            where: { shopId: shop_id },
            attributes: {
                include: [
                    [sequelize.fn('AVG', sequelize.col('reviews.rating')), 'rating']
                ]
            },
            include: [
                {
                    model: db.Shop,
                    as: 'shop',
                    attributes: ['id', 'shop_name', 'logo_url']
                },
                {
                    model: db.ProductImages,
                    as: 'product_images',
                    attributes: ['id', 'image_url']
                },
                {
                    model: db.Category,
                    as: 'category',
                    attributes: ['id', 'category_name'],
                    include: {
                        model: db.Category,
                        as: 'parent',
                        attributes: ['id', 'category_name']
                    }
                },
                {
                    model: db.Review,
                    as: 'reviews',
                    attributes: []
                },
            ],
            group: [
                'Product.id',
                'shop.id',
                'product_images.id',
                'category.id',
                'category->parent.id'
            ], // Bổ sung group theo review.id
            subQuery: false, // Ngăn việc sinh subquery gây mất dữ liệu
            transaction: t
        });

        const payload = {
            products: products
        }

        await t.commit();

        return ResponseModel.success('Danh sách Product của Shop', payload);
    } catch (error) {
        await t.rollback();
        throw error;
    }
}

export const fetchProductById = async (productId) => {
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

export const fetchAllProduct = async (shopId) => {
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

export const createNewProduct = async (data, files, shopId) => {
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

export const updateProduct = async (productId, data, files) => {
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

export const deleteProductById = async (productId) => {
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

/** MOBILE */

export const searchAndFilterProductsMobile = async (
    searchValue = '',
    page = 1,
    limit = 10,
    origins = [],
    categoryId = null,
    sortPrice = 'ASC',
    minPrice = 0,
    maxPrice = Infinity,
    minRatings = []
) => {
    try {

        if (page < 1 || limit < 1) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Page và limit phải là số dương', { page, limit });
        }

        if (minPrice < 0 || maxPrice < minPrice) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Mức giá tìm kiếm không hợp lệ', {});
        }

        if (minRatings.length > 0 && minRatings.some(r => ![1, 2, 3, 4, 5].includes(r))) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Mức sao tìm kiếm không hợp lệ', {});
        }

        const offset = (page - 1) * limit;

        /** Điều kiện tìm kiếm */
        const where = {};
        if (searchValue) {
            where.product_name = {
                [Op.like]: `%${searchValue}%`
            };
        }

        if (origins.length > 0) {
            where.origin = {
                [Op.in]: origins
            }
        }

        if (minPrice > 0 || maxPrice < Infinity) {
            where.unit_price = {
                [Op.between]: [minPrice, maxPrice]
            }
        }

        const categoryWhere = categoryId
            ? {
                id: categoryId,
                parentId: {
                    [Op.not]: null
                }
            }
            : {}

        const subQuertRating = sequelize.literal(`(
            SELECT AVG(rating)
            FROM Reviews
            WHERE Reviews.product_id = Product.id    
        )`);

        /** Điều kiện lọc theo rating */
        const having = minRatings.length > 0
            ? sequelize.literal(`AVG(rating) IN (${minRatings.join(', ')})`)
            : null;

        const { count, rows } = await db.Product.findAndCountAll({
            where,
            attributes: [
                'id',
                'product_name',
                'unit_price',
                'sold_quantity',
                'origin',
                [subQuertRating, 'rating']
            ],
            include: [
                {
                    model: db.Shop,
                    as: 'shop',
                    attributes: ['id', 'shop_name', 'logo_url'],
                    required: false
                },
                {
                    model: db.ProductImages,
                    as: 'product_images',
                    attributes: ['id', 'image_url'],
                    required: false
                },
                {
                    model: db.Category,
                    as: 'category',
                    attributes: ['id', 'category_name', 'parentId'],
                    where: categoryWhere,
                    include: {
                        model: db.Category,
                        as: 'parent',
                        attributes: ['id', 'category_name'],
                        required: false
                    }
                },
                {
                    model: db.Review,
                    as: 'reviews',
                    attributes: [],
                    required: false
                }
            ],
            limit,
            offset,
            distinct: 'Product.id',
            order: [['unit_price', sortPrice.toUpperCase()]],
            group: having ?
                ['Product.id']
                : null,
            having: having
        });

        const totalPages = Math.ceil(count.length ? count.length : (count / limit));

        const payload = {
            products: rows,
            paginate: {
                currentPage: page,
                limit: limit,
                totalItems: count.length ? count.length : count,
                totalPages: totalPages
            }
        }

        return ResponseModel.success('Kết quả tìm kiếm', payload);
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const searchAndFilterProductShopMobile = async (
    searchValue = '',
    page = 1,
    limit = 10,
    origins = [],
    categoryId = null,
    sortPrice = 'ASC',
    minPrice = 0,
    maxPrice = Infinity,
    minRatings = [],
    shopId
) => {
    try {
        if (page < 1 || limit < 1) {
            throw ResponseModel.error(HttpErrors.BAD_REQUEST, 'Page và limit phải là số dương', { page, limit });
        }

        if (minPrice < 0 || (maxPrice !== Infinity && maxPrice < minPrice)) {
            throw ResponseModel.error(HttpErrors.BAD_REQUEST, 'Mức giá tìm kiếm không hợp lệ', {});
        }

        if (minRatings.length > 0 && minRatings.some(r => ![1, 2, 3, 4, 5].includes(r))) {
            throw ResponseModel.error(HttpErrors.BAD_REQUEST, 'Mức sao tìm kiếm không hợp lệ', {});
        }

        // Kiểm tra hợp lệ cho shopId (nếu có)
        if (shopId !== null && (typeof shopId !== 'number' || shopId <= 0)) {
            throw ResponseModel.error(HttpErrors.BAD_REQUEST, 'Shop ID không hợp lệ', {});
        }

        const offset = (page - 1) * limit;

        const where = {};

        if (searchValue) {
            where.product_name = {
                [Op.like]: `%${searchValue}%`,
            };
        }

        if (origins.length > 0) {
            where.origin = {
                [Op.in]: origins,
            };
        }

        // Lọc theo khoảng giá
        if (minPrice > 0 || maxPrice < Infinity) {
            const adjustedMaxPrice = maxPrice === Infinity ? Number.MAX_SAFE_INTEGER : maxPrice;
            where.unit_price = {
                [Op.between]: [minPrice, adjustedMaxPrice],
            };
        }

        if (shopId !== null) {
            where.shopId = shopId;
        }

        const categoryWhere = categoryId
            ? {
                id: categoryId,
                parentId: {
                    [Op.not]: null,
                },
            }
            : {};

        // Subquery để tính rating trung bình
        const subQueryRating = sequelize.literal(`(
            SELECT AVG(rating)
            FROM Reviews
            WHERE Reviews.product_id = Product.id
        )`);

        // Điều kiện lọc theo rating
        const having = minRatings.length > 0
            ? sequelize.literal(`AVG(rating) IN (${minRatings.join(', ')})`)
            : null;

        const { count, rows } = await db.Product.findAndCountAll({
            where,
            attributes: [
                'id',
                'product_name',
                'unit_price',
                'sold_quantity',
                'origin',
                [subQueryRating, 'rating'],
            ],
            include: [
                {
                    model: db.Shop,
                    as: 'shop',
                    attributes: ['id', 'shop_name', 'logo_url'],
                    required: shopId !== null, // Bắt buộc có shop nếu shopId được truyền
                },
                {
                    model: db.ProductImages,
                    as: 'product_images',
                    attributes: ['id', 'image_url'],
                    required: false,
                },
                {
                    model: db.Category,
                    as: 'category',
                    attributes: ['id', 'category_name', 'parentId'],
                    where: categoryWhere,
                    include: {
                        model: db.Category,
                        as: 'parent',
                        attributes: ['id', 'category_name'],
                        required: false,
                    },
                },
                {
                    model: db.Review,
                    as: 'reviews',
                    attributes: [],
                    required: false,
                },
            ],
            limit,
            offset,
            distinct: 'Product.id',
            order: [['unit_price', sortPrice.toUpperCase()]],
            group: having ? ['Product.id'] : null,
            having: having,
        });

        const totalPages = Math.ceil(count.length ? count.length : count / limit);

        const payload = {
            products: rows,
            paginate: {
                currentPage: page,
                limit: limit,
                totalItems: count.length ? count.length : count,
                totalPages: totalPages,
            },
        };

        return ResponseModel.success('Kết quả tìm kiếm', payload);
    } catch (error) {
        throw ResponseModel.error(error?.status || HttpErrors.INTERNAL_SERVER_ERROR, error?.message || 'Lỗi không xác định', error?.body || {});
    }
}

export const searchAndFilterProductsByParentCategoryMobile = async (
    parentCategoryId,
    searchValue = '',
    page = 1,
    limit = 10,
    origins = [],
    sortPrice = 'ASC',
    minPrice = 0,
    maxPrice = Infinity,
    minRatings = [],
) => {
    try {
        if (page < 1 || limit < 1) {
            throw ResponseModel.error(HttpErrors.BAD_REQUEST, 'Page và limit phải là số dương', { page, limit });
        }

        if (minPrice < 0 || (maxPrice !== Infinity && maxPrice < minPrice)) {
            throw ResponseModel.error(HttpErrors.BAD_REQUEST, 'Mức giá tìm kiếm không hợp lệ', {});
        }

        if (minRatings.length > 0 && minRatings.some(r => ![1, 2, 3, 4, 5].includes(r))) {
            throw ResponseModel.error(HttpErrors.BAD_REQUEST, 'Mức sao tìm kiếm không hợp lệ', {});
        }

        if (parentCategoryId !== null && (typeof parseInt(parentCategoryId) !== 'number' || parseInt(parentCategoryId) <= 0)) {
            throw ResponseModel.error(HttpErrors.BAD_REQUEST, 'Parent Id không hợp lệ', {});
        }

        const offset = (page - 1) * limit;

        const whereClause = {};

        if (searchValue) {
            whereClause.product_name = {
                [Op.like]: `%${searchValue}%`,
            };
        }

        if (origins.length > 0) {
            whereClause.origin = {
                [Op.in]: origins,
            };
        }

        // Lọc theo khoảng giá
        if (minPrice > 0 || maxPrice < Infinity) {
            const adjustedMaxPrice = maxPrice === Infinity ? Number.MAX_SAFE_INTEGER : maxPrice;
            whereClause.unit_price = {
                [Op.between]: [minPrice, adjustedMaxPrice],
            };
        }

        // Subquery để tính rating trung bình
        const subQueryRating = sequelize.literal(`(
            SELECT AVG(rating)
            FROM Reviews
            WHERE Reviews.product_id = Product.id
        )`);

        // Điều kiện lọc theo rating
        const having = minRatings.length > 0
            ? sequelize.literal(`AVG(rating) IN (${minRatings.join(', ')})`)
            : null;

        const { count, rows } = await db.Product.findAndCountAll({
            where: whereClause,
            attributes: [
                'id',
                'product_name',
                'unit_price',
                'sold_quantity',
                'origin',
                [subQueryRating, 'rating'],
            ],
            include: [
                {
                    model: db.ProductImages,
                    as: 'product_images',
                    attributes: ['id', 'image_url'],
                    required: false,
                },
                {
                    model: db.Category,
                    as: 'category',
                    attributes: ['id', 'category_name', 'parentId'],
                    where: {
                        parentId: parentCategoryId
                    },
                },
                {
                    model: db.Review,
                    as: 'reviews',
                    attributes: [],
                    required: false,
                },
            ],
            limit,
            offset,
            distinct: 'Product.id',
            order: [['unit_price', sortPrice.toUpperCase()]],
            group: having ? ['Product.id'] : null,
            having: having,
        });

        const totalPages = Math.ceil(count.length ? count.length : count / limit);

        const payload = {
            products: rows,
            paginate: {
                currentPage: page,
                limit: limit,
                totalItems: count.length ? count.length : count,
                totalPages: totalPages,
            },
        };

        return ResponseModel.success('Kết quả tìm kiếm', payload);
    } catch (error) {
        throw ResponseModel.error(error?.status || HttpErrors.INTERNAL_SERVER_ERROR, error?.message || 'Lỗi không xác định', error?.body || {});
    }
}

export const searchAndFilterLatestProductsMobile = async (
    searchValue = '',
    page = 1,
    limit = 10,
    origins = [],
    categoryId = null,
    sortPrice = 'ASC',
    minPrice = 0,
    maxPrice = Infinity,
    minRatings = []
) => {
    try {

        if (page < 1 || limit < 1) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Page và limit phải là số dương', { page, limit });
        }

        if (minPrice < 0 || maxPrice < minPrice) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Mức giá tìm kiếm không hợp lệ', {});
        }

        if (minRatings.length > 0 && minRatings.some(r => ![1, 2, 3, 4, 5].includes(r))) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Mức sao tìm kiếm không hợp lệ', {});
        }

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const offset = (page - 1) * limit;

        /** Điều kiện tìm kiếm */
        const where = {
            createdAt: {
                [Op.gte]: startOfMonth,
                [Op.lte]: now
            }
        };
        if (searchValue) {
            where.product_name = {
                [Op.like]: `%${searchValue}%`
            };
        }

        if (origins.length > 0) {
            where.origin = {
                [Op.in]: origins
            }
        }

        if (minPrice > 0 || maxPrice < Infinity) {
            where.unit_price = {
                [Op.between]: [minPrice, maxPrice]
            }
        }

        const categoryWhere = categoryId
            ? {
                id: categoryId,
                parentId: {
                    [Op.not]: null
                }
            }
            : {}

        const subQuertRating = sequelize.literal(`(
            SELECT AVG(rating)
            FROM Reviews
            WHERE Reviews.product_id = Product.id    
        )`);

        /** Điều kiện lọc theo rating */
        const having = minRatings.length > 0
            ? sequelize.literal(`AVG(rating) IN (${minRatings.join(', ')})`)
            : null;

        const { count, rows } = await db.Product.findAndCountAll({
            where,
            attributes: [
                'id',
                'product_name',
                'unit_price',
                'sold_quantity',
                'origin',
                [subQuertRating, 'rating']
            ],
            include: [
                {
                    model: db.Shop,
                    as: 'shop',
                    attributes: ['id', 'shop_name', 'logo_url'],
                    required: false
                },
                {
                    model: db.ProductImages,
                    as: 'product_images',
                    attributes: ['id', 'image_url'],
                    required: false
                },
                {
                    model: db.Category,
                    as: 'category',
                    attributes: ['id', 'category_name', 'parentId'],
                    where: categoryWhere,
                    required: !!categoryId, // Chỉ yêu cầu JOIN nếu có categoryId
                    include: {
                        model: db.Category,
                        as: 'parent',
                        attributes: ['id', 'category_name'],
                        required: false
                    }
                },
                {
                    model: db.Review,
                    as: 'reviews',
                    attributes: [],
                    required: false
                }
            ],
            limit,
            offset,
            distinct: 'Product.id',
            order: [
                ['unit_price', sortPrice.toUpperCase()],
                ['createdAt', 'DESC']
            ],
            subQuery: false,
            group: having ?
                ['Product.id', 'shop.id', 'category.id']
                : null,
            having: having
        });

        const totalPages = Math.ceil(count.length ? count.length : (count / limit));

        const payload = {
            products: rows,
            paginate: {
                currentPage: page,
                limit: limit,
                totalItems: count.length ? count.length : count,
                totalPages: totalPages
            }
        }

        return ResponseModel.success('Kết quả tìm kiếm', payload);
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}