import HttpErrors from '../../common/errors/http-errors';
import { ResponseModel } from '../../common/errors/response';
import { sendActivateStoreMailer, sendDeclineStoreMailer } from '../../common/mails/mailer.config';
import { handleDeleteImageAsFailed, handleDeleteImages } from '../../common/middleware/upload.middleware';
import { ShopStatus } from '../../common/utils/status';
import db, { sequelize } from '../models';

export const fetchAllProductsInShop = async (shopId) => {
    try {
        const shop = await db.Shop.findOne({
            where: { id: shopId },
            include:
            {
                model: db.Product,
                as: 'products',
                attributes: ['id', 'product_name', 'unit_price', 'sold_quantity']
            }

        });
        if (!shop) {
            ResponseModel.error(HttpErrors.NOT_FOUND, 'Không tìm thấy cửa hàng', []);
        }
        return ResponseModel.success(`Tìm thấy cửa hàng ${shop.id}.`, {
            shop: shop
        });
    } catch (error) {
        ResponseModel.error(error.status, error.message, error?.body);
    }
}

export const fetchAllShop = async () => {
    try {
        const response = await db.Shop.findAll({
            include: [
                {
                    model: db.User,
                    as: 'user',
                    attributes: ['id', 'name', 'email', 'phone', 'address']
                },
                {
                    model: db.Product,
                    as: 'products',
                    attributes: ['id', 'product_name', 'sold_quantity'],
                    include: [
                        {
                            model: db.ProductVariant,
                            as: 'variants',
                            attributes: ['id', 'stock_quantity']
                        }
                    ]
                }
            ],
            attributes: {
                exclude: ['updatedAt']
            },
            raw: false
        });

        const payload = {
            shops: response
        };
        return ResponseModel.success('Danh sách cửa hàng', payload);
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const fetchRegisterShops = async () => {
    try {
        const response = await db.Shop.findAll({
            where: { status: ShopStatus.PENDING },
            attributes: {
                exclude: ['updatedAt']
            },
            include: [
                {
                    model: db.User,
                    as: 'user',
                    attributes: ['id', 'name', 'email', 'phone', 'address', 'gender']
                },
            ],
        });

        const payload = {
            shops: response
        };
        return ResponseModel.success('Danh sách cửa hàng', payload);
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const fetchShopById = async (shopId) => {
    try {
        if (!shopId) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu trường cần thiết', {
                id: shopId
            });
        }

        const shop = await db.Shop.findOne({
            where: { id: shopId },
            include: [
                {
                    model: db.User,
                    as: 'user',
                    attributes: ['id', 'name', 'email', 'phone', 'address', 'gender', 'image_url']
                }
            ]
        });

        if (!shop) {
            ResponseModel.error(HttpErrors.NOT_FOUND, 'Không tìm thấy cửa hàng');
        }

        const payload = {
            shops: [shop]
        };

        return ResponseModel.success('Danh sách cửa hàng', payload);
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const createNewShop = async (shopInfo, files) => {
    try {
        if (!shopInfo) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu trường cần thiết', {
                shopInfo: shopInfo
            });
        }

        const {
            shop_name,
            contact_email,
            contact_address,
            description
        } = JSON.parse(shopInfo);

        if (!shop_name || !contact_email || !contact_address) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu trường cần thiết', {
                shop_name: shop_name,
                contact_email: contact_email,
                contact_address: contact_address
            });
        }

        await db.Shop.create({
            shop_name: shop_name,
            logo_url: files && files['logoShopFile']
                ? `shops/${files['logoShopFile'][0].filename}`
                : '',
            background_url: files && files['backgroundShopFile']
                ? `shop-backgrounds/${files['backgroundShopFile'][0].filename}`
                : '',
            contact_email: contact_email ?? '',
            contact_address: contact_address ?? '',
            description: description ?? ''
        });

        return ResponseModel.success('Tạo cửa hàng thành công.', null);
    } catch (error) {
        console.log(error);
        ResponseModel.error(error.status, error.message, error?.body);
    }
}

export const updateShopById = async (shopId, info, files) => {
    try {
        if (!shopId || !info) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu trường cần thiết', {
                shopId: shopId,
                info: info,
            })
        }

        const existShop = await db.Shop.findOne({
            where: { id: shopId }
        });

        if (!existShop) {
            ResponseModel.error(HttpErrors.NOT_FOUND, `Không tìm thấy cửa hảng.`);
        }

        const {
            shop_name,
            contact_email,
            contact_address,
            description,
        } = JSON.parse(info);

        const deleteImageURLs = [];

        if (shop_name) {
            existShop.shop_name = shop_name;
        };
        existShop.contact_email = contact_email;
        existShop.contact_address = contact_address;
        existShop.description = description;

        if (files && files['logoShopFile']) {
            deleteImageURLs.push(existShop.logo_url);
            existShop.logo_url = `shops/${files['logoShopFile'][0].filename}`;
        }

        if (files && files['backgroundShopFile']) {
            deleteImageURLs.push(existShop.background_url);
            existShop.background_url = `shop-backgrounds/${files['backgroundShopFile'][0].filename}`;
        }

        if (deleteImageURLs.length > 0) {
            await handleDeleteImages(deleteImageURLs);
        }

        await existShop.save();

        return ResponseModel.success('Cập nhật thành công');
    } catch (error) {
        await handleDeleteImageAsFailed(files['logoShopFile'][0]);
        await handleDeleteImageAsFailed(files['backgroundShopFile'][0]);
        ResponseModel.error(error.status, error?.message);
    }
}

export const deleteShopById = async (shopId) => {
    try {
        const existShop = await db.Shop.findOne({
            where: { id: shopId }
        });

        if (!existShop) {
            ResponseModel.error(HttpErrors.NOT_FOUND, 'Không tìm thấy cửa hàng.');
        }

        const { background_url, logo_url } = existShop;
        await handleDeleteImages([background_url, logo_url]);
        await db.Shop.destroy({
            where: { id: shopId }
        });

        return ResponseModel.success('Xóa cửa hàng thành công.');
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const acceptRegisterShopById = async (shopId) => {
    try {
        const existShop = await db.Shop.findOne({
            where: { id: shopId },
            include: [
                {
                    model: db.User,
                    as: 'user',
                    attributes: ['id', 'name']
                }
            ]
        });

        if (!existShop) {
            ResponseModel.error(HttpErrors.NOT_FOUND, 'Không tìm thấy cửa hàng.');
        }

        existShop.status = ShopStatus.ACTIVE;
        await existShop.save();

        sendActivateStoreMailer(
            "buikienduy2020@gmail.com",
            existShop.user?.name ?? '',
            existShop.shop_name ?? '',
        );

        return ResponseModel.success('Chấp thuận đơn đăng ký cửa hàng');
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const declineRegisterShopById = async (shopId) => {
    try {
        const existShop = await db.Shop.findOne({
            where: { id: shopId },
            include: [
                {
                    model: db.User,
                    as: 'user',
                    attributes: ['id', 'name', 'image_url']
                }
            ]
        });

        if (!existShop) {
            ResponseModel.error(HttpErrors.NOT_FOUND, 'Không tìm thấy cửa hàng.');
        }

        const { background_url, logo_url, user } = existShop;
        await handleDeleteImages([background_url, logo_url, user?.image_url ?? '']);
        await db.Shop.destroy({
            where: { id: shopId }
        });

        sendDeclineStoreMailer(
            "buikienduy2020@gmail.com",
            existShop.user?.name ?? '',
            existShop.shop_name ?? '',
            "buikienduy2020@gmail.com"
        );

        return ResponseModel.success('Bác bỏ đơn đăng ký cửa hàng');
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

/** MOBILE */
export const fetchPopularProductsByShop = async (shop_id, page = 1, limit = 10) => {
    try {

        if (!shop_id) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, "Thiếu thông tin cần thiết", {
                shop_id: shop_id ?? ''
            });
        }

        if (page < 1 || limit < 1) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Page và limit phải là số dương', { page, limit });
        }

        const offset = (page - 1) * limit;

        /** Subquery để tính rating trung bình */
        const ratingSubquery = sequelize.literal(`(
            SELECT AVG(rating)
            FROM Reviews
            WHERE Reviews.product_id = Product.id
        )`);

        const { count, rows } = await db.Product.findAndCountAll({
            where: {
                shopId: shop_id
            },
            attributes: [
                'id',
                'product_name',
                'unit_price',
                'sold_quantity',
                [ratingSubquery, 'rating']
            ],
            include: [
                {
                    model: db.Category,
                    as: 'category',
                    attributes: ['id', 'category_name'],
                    include: {
                        model: db.Category,
                        as: 'parent',
                        attributes: ['id', 'category_name'],
                    },
                },
                {
                    model: db.ProductImages,
                    as: 'product_images',
                    attributes: ['id', 'image_url'],
                },
                {
                    model: db.Shop,
                    as: 'shop',
                    attributes: ['id', 'shop_name', 'logo_url'],
                },
            ],
            order: [['sold_quantity', 'DESC']],
            limit,
            offset,
            distinct: true, /** Chỉ tính Product duy nhất -> Tránh tính thêm cái product images -> Sai totalItems */
        })

        const totalPages = Math.ceil(count / limit);

        const payload = {
            products: rows,
            pagination: {
                currentPage: page,
                totalPages: totalPages,
                totalItems: count,
                limit
            }
        }

        return ResponseModel.success('Danh sách best seller', payload);
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const fetchLatestProductsByShop = async (shop_id, page = 1, limit = 10) => {
    try {

        if (!shop_id) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, "Thiếu thông tin cần thiết", {
                shop_id: shop_id ?? ''
            });
        }

        if (page < 1 || limit < 1) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Page và limit phải là số dương', { page, limit });
        }

        const offset = (page - 1) * limit;

        /** Subquery để tính rating trung bình */
        const ratingSubquery = sequelize.literal(`(
            SELECT AVG(rating)
            FROM Reviews
            WHERE Reviews.product_id = Product.id
        )`);

        const { count, rows } = await db.Product.findAndCountAll({
            where: {
                shopId: shop_id
            },
            attributes: [
                'id',
                'product_name',
                'unit_price',
                'sold_quantity',
                'createdAt', /** Cần để còn order */
                [ratingSubquery, 'rating']
            ],
            include: [
                {
                    model: db.Category,
                    as: 'category',
                    attributes: ['id', 'category_name'],
                    include: {
                        model: db.Category,
                        as: 'parent',
                        attributes: ['id', 'category_name'],
                    },
                },
                {
                    model: db.ProductImages,
                    as: 'product_images',
                    attributes: ['id', 'image_url'],
                },
                {
                    model: db.Shop,
                    as: 'shop',
                    attributes: ['id', 'shop_name', 'logo_url'],
                },
            ],
            order: [['createdAt', 'DESC']],
            limit,
            offset,
            distinct: true, /** Chỉ tính Product duy nhất -> Tránh tính thêm cái product images -> Sai totalItems */
        })

        const totalPages = Math.ceil(count / limit);

        const payload = {
            products: rows,
            pagination: {
                currentPage: page,
                totalPages: totalPages,
                totalItems: count,
                limit
            }
        }

        return ResponseModel.success('Danh sách recents', payload);
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const fetchPriceProductsByShop = async (shop_id, page = 1, limit = 10, sort) => {
    try {
        if (!shop_id) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, "Thiếu thông tin cần thiết", {
                shop_id: shop_id ?? ''
            });
        }

        if (page < 1 || limit < 1) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Page và limit phải là số dương', { page, limit });
        }

        if (!['ASC', 'DESC'].includes(sort.toUpperCase())) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Sort phải là asc hoặc desc');
        }

        const offset = (page - 1) * limit;
        const ratingSubquert = sequelize.literal(`(
            SELECT AVG(rating)
            FROM Reviews
            WHERE Reviews.product_id = Product.id
        )`);

        const { count, rows } = await db.Product.findAndCountAll({
            where: { shopId: shop_id },
            attributes: [
                'id',
                'product_name',
                'unit_price',
                'sold_quantity',
                [ratingSubquert, 'rating']
            ],
            include: [
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
                    model: db.ProductImages,
                    as: 'product_images',
                    attributes: ['id', 'image_url'],
                },
                {
                    model: db.Shop,
                    as: 'shop',
                    attributes: ['id', 'shop_name', 'logo_url'],
                },
                {
                    model: db.ProductVariant,
                    as: 'variants',
                    attributes: ['id', 'stock_quantity'],
                },
            ],
            order: [['unit_price', sort.toUpperCase()]],
            limit,
            offset,
            distinct: true
        });

        const totalPages = Math.ceil(count / limit);

        const payload = {
            products: rows,
            pagination: {
                currentPage: page,
                totalPages: totalPages,
                totalItems: count,
                limit
            }
        }

        return ResponseModel.success('Danh sách sản phẩm theo giá', payload);
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const fetchParentCategoriesWithTotalProductByShop = async (
    shop_id
) => {
    try {
        if (!shop_id) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, "Thiếu thông tin cần thiết", {
                shop_id: shop_id ?? ''
            });
        }

        /** Subquery để lấy danh sách categoryId của danh mục con */
        // const childCategoryIdsSubquery = sequelize.literal(`(
        //     SELECT id
        //     FROM Categories AS child
        //     WHERE child.parentId = Category.id    
        // )`);

        /** Đếm số sản phẩm thuộc danh mục con của danh mục cha */
        const productCountSubquery = sequelize.literal(`(
            SELECT COUNT(*)
            FROM Products
            WHERE Products.categoryId IN (
                SELECT id
                FROM Categories
                WHERE Categories.parentId = Category.id
            )
            AND Products.shopId = :shop_id    
        )`);

        const categories = await db.Category.findAll({
            where: {
                parentId: null, /** Chỉ lấy danh mục cha */
            },
            attributes: [
                'id',
                'category_name',
                'image_url',
                'description',
                [productCountSubquery, 'count']
            ],
            replacements: { shop_id }, /** Truyền shop_id vào subquery */
            include: [
                {
                    model: db.Category,
                    as: 'children',
                    attributes: ['id', 'category_name'], /** Lấy danh mục con (Optional) */
                    required: false
                }
            ],
        })

        const payload = {
            categories: categories
        }

        return ResponseModel.success('Danh sách danh mục cha', payload);
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}