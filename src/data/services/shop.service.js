import { Op } from 'sequelize';
import HttpErrors from '../../common/errors/http-errors';
import { ResponseModel } from '../../common/errors/response';
import { sendActivateStoreMailer, sendDeclineStoreMailer } from '../../common/mails/mailer.config';
import { handleDeleteImageAsFailed, handleDeleteImages } from '../../common/middleware/upload.middleware';
import { OrderStatus, ShopStatus } from '../../common/utils/status';
import db, { Sequelize, sequelize } from '../models';
import { UserRoles } from '../../common/utils/roles';
import { comparePassword, hashPassword } from "../../common/utils/user.common";

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

export const fetchListShopNotPending = async () => {
    try {
        const response = await db.Shop.findAll({
            where: {
                status: {
                    [Op.not]: ShopStatus.PENDING
                }
            },
            attributes: {
                exclude: ['updatedAt'],
                include: [
                    [
                        Sequelize.literal(`(
                            SELECT SUM(stock_quantity)
                            FROM productvariants AS pv
                            INNER JOIN products AS p ON pv.productId = p.id
                            WHERE p.shopId = Shop.id
                        )`),
                        'totalStock'
                    ]
                ]
            },
            include: [
                {
                    model: db.User,
                    as: 'user',
                    attributes: ['id', 'name', 'email', 'phone', 'address', 'gender'],
                    required: false
                },
                {
                    model: db.Product,
                    as: 'products',
                    attributes: [],
                    required: false,
                    include: [
                        {
                            model: db.ProductVariant,
                            as: 'variants',
                            attributes: [],
                            required: false
                        }
                    ]
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        return ResponseModel.success('Danh sách cửa hàng', {
            shops: response.map(shop => ({
                ...shop.toJSON(),
                total_stock: parseInt(shop.getDataValue('totalStock') || 0)
            }))
        });
    } catch (error) {
        return ResponseModel.error(error?.status, error?.message, error?.body);
    }
};

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
                    attributes: ['id', 'name', 'email', 'phone', 'address', 'gender'],
                    required: false
                },
            ],
            order: [['createdAt', 'DESC']]
        });

        return ResponseModel.success('Danh sách cửa hàng', {
            shops: response
        });
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

export const fetchShopByTokenId = async (tokenShopId) => {
    try {
        if (!tokenShopId) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu trường cần thiết', {
                tokenShopId: tokenShopId ?? '',
            });
        }

        const shop = await db.Shop.findOne({
            where: { id: tokenShopId },
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

export const fetchListLatestOrderShop = async (tokenShopId, { dateRanges }) => {
    try {
        if (!tokenShopId || !dateRanges || !Array.isArray(dateRanges)) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu trường cần thiết', {
                tokenShopId: tokenShopId ?? '',
                dateRanges: dateRanges ?? []
            });
        }


        const shop = await db.Shop.findOne({
            where: { id: tokenShopId },
        });

        if (!shop) {
            ResponseModel.error(HttpErrors.NOT_FOUND, 'Không tìm thấy cửa hàng');
        }

        const { startDate, endDate, month } = dateRanges[0];

        const latestOrderShops = await db.OrderShop.findAll({
            where: {
                shop_id: tokenShopId,
                createdAt: {
                    [Op.between]: [new Date(startDate), new Date(endDate)]
                },
            },
            include: [
                {
                    model: db.Order,
                    as: 'order',
                    where: {
                        status: {
                            [Op.ne]: OrderStatus.CANCELED
                        }
                    },
                    include: [
                        {
                            model: db.Address,
                            as: 'address',
                            include: [
                                { model: db.City, as: 'city' },
                                { model: db.District, as: 'district' },
                                { model: db.Ward, as: 'ward' }
                            ],
                            required: false
                        },
                        {
                            model: db.User,
                            as: 'user',
                            attributes: ['id', 'name', 'email', 'phone']
                        }
                    ]
                },
                {
                    model: db.OrderItem,
                    as: 'order_shop_items',
                    include: [
                        {
                            model: db.ProductVariant,
                            as: 'product_variant',
                            attributes: ['id', 'sku', 'image_url', 'stock_quantity'],
                            include: [
                                {
                                    model: db.Product,
                                    as: 'product',
                                    attributes: ['id', 'product_name', 'unit_price']
                                },
                                {
                                    model: db.Color,
                                    as: 'color',
                                    attributes: ['id', 'color_name', 'color_code'],
                                    required: false
                                },
                                {
                                    model: db.Size,
                                    as: 'size',
                                    attributes: ['id', 'size_code'],
                                    required: false
                                }
                            ]
                        }
                    ]
                },
                {
                    model: db.Coupon,
                    as: 'coupon',
                    attributes: [
                        'id', 'name', 'code', 'discount_type',
                        'discount_value', 'max_discount'
                    ],
                    required: false
                }
            ],
            order: [['createdAt', 'DESC']],
            attributes: [
                'id', 'subtotal', 'discount', 'final_total',
                'status', 'createdAt', 'order_id'
            ]
        });

        const formattedOrders = latestOrderShops.map(orderShop => ({
            id: orderShop.order_id,
            order_shop_id: orderShop.id,
            status: orderShop.status,
            subtotal: parseFloat(orderShop.subtotal),
            discount: parseFloat(orderShop.discount),
            final_total: parseFloat(orderShop.final_total),
            created_at: orderShop.createdAt,
            coupon: orderShop.coupon ? {
                id: orderShop.coupon.id,
                name: orderShop.coupon.name,
                code: orderShop.coupon.code,
                discountType: orderShop.coupon.discount_type,
                discountValue: parseFloat(orderShop.coupon.discount_value),
                maxDiscount: parseFloat(orderShop.coupon.max_discount)
            } : undefined,
            user: orderShop.order?.user ? {
                id: orderShop.order.user.id,
                name: orderShop.order.user.name,
                email: orderShop.order.user.email,
                phone: orderShop.order.user.phone
            } : undefined,
            address: orderShop.order?.address ? {
                addressDetail: orderShop.order.address.address_detail,
                city: orderShop.order.address.city,
                district: orderShop.order.address.district,
                ward: orderShop.order.address.ward,
                phone: orderShop.order.address.phone,
                name: orderShop.order.address.name
            } : undefined,
            order_items: orderShop.order_shop_items.map(item => ({
                id: item.id,
                order_shop: {
                    id: orderShop.id
                },
                quantity: item.quantity,
                product_variant: {
                    id: item.product_variant.id,
                    sku: item.product_variant.sku,
                    image_url: item.product_variant.image_url,
                    stock_quantity: item.product_variant.stock_quantity,
                    product: {
                        id: item.product_variant.product.id,
                        name: item.product_variant.product.product_name,
                        unit_price: parseFloat(item.product_variant.product.unit_price)
                    },
                    color: item.product_variant.color ? {
                        id: item.product_variant.color.id,
                        color_name: item.product_variant.color.color_name,
                        color_code: item.product_variant.color.color_code
                    } : undefined,
                    size: item.product_variant.size ? {
                        id: item.product_variant.size.id,
                        size_code: item.product_variant.size.size_code
                    } : undefined
                }
            }))
        }));

        return ResponseModel.success('Danh sách đơn hàng mới', {
            orders: formattedOrders
        });
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const createNewShop = async (userInfo, shopInfo, files) => {
    const transaction = await sequelize.transaction();
    try {
        if (!shopInfo || !userInfo) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu trường cần thiết', {
                shopInfo: shopInfo,
                userInfo: userInfo ?? ''
            });
        }

        const {
            name,
            email,
            address,
            password,
            phone,
            gender
        } = JSON.parse(userInfo);

        const {
            shop_name,
            contact_email,
            contact_address,
            description
        } = JSON.parse(shopInfo);

        if (!name || !password || !email || !phone) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu trường cần thiết', {
                name: name ?? '',
                email: email ?? '',
                phone: phone ?? '',
                password: password ?? ''
            });
        }

        if (!shop_name || !contact_email || !contact_address) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu trường cần thiết', {
                shop_name: shop_name,
                contact_email: contact_email,
                contact_address: contact_address
            });
        }

        const existingUser = await db.User.findOne({
            where: { email: contact_email },
            transaction
        });

        if (existingUser) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Email đã được sử dụng', {
                contact_email: contact_email
            });
        }

        const existingShop = await db.Shop.findOne({
            where: { contact_email: contact_email },
            transaction
        });

        if (existingShop) {
            await transaction.rollback();
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Email liên hệ của cửa hàng đã được sử dụng', {
                contact_email: contact_email
            });
        }

        const createdShop = await db.Shop.create({
            shop_name: shop_name,
            logo_url: files && files['logoShopFile']
                ? `shops/${files['logoShopFile'][0].filename}`
                : '',
            background_url: files && files['backgroundShopFile']
                ? `shop-backgrounds/${files['backgroundShopFile'][0].filename}`
                : '',
            contact_email: contact_email ?? '',
            contact_address: contact_address ?? '',
            description: description ?? '',
            status: ShopStatus.ACTIVE,
            statusChangedAt: new Date()
        }, { transaction });

        await db.User.create({
            name: name,
            email: email,
            address: address ?? '',
            password: hashPassword(password),
            phone: phone,
            gender: gender,
            image_url: files && files['adminOwnerFile']
                ? `admin-owners/${files['adminOwnerFile'][0].filename}`
                : '',
            shopId: createdShop.id
        }, { transaction })

        await transaction.commit();

        return ResponseModel.success('Tạo cửa hàng thành công.', {});
    } catch (error) {
        console.log(error);
        await transaction.rollback();
        await handleDeleteImageAsFailed(files['adminOwnerFile'][0]);
        await handleDeleteImageAsFailed(files['logoShopFile'][0]);
        await handleDeleteImageAsFailed(files['backgroundShopFile'][0]);
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
    const transaction = await sequelize.transaction();

    try {
        const existShop = await db.Shop.findOne({
            where: { id: shopId },
            include: [
                {
                    model: db.User,
                    as: 'user',
                    attributes: ['id', 'name', 'roles']
                }
            ]
        });

        if (!existShop) {
            ResponseModel.error(HttpErrors.NOT_FOUND, 'Không tìm thấy cửa hàng.');
        }

        existShop.status = ShopStatus.ACTIVE;
        existShop.statusChangedAt = new Date();
        await existShop.save({ transaction });

        sendActivateStoreMailer(
            "buikienduy2020@gmail.com",
            existShop.user?.name ?? '',
            existShop.shop_name ?? '',
        );

        await transaction.commit();

        return ResponseModel.success('Chấp thuận đơn đăng ký cửa hàng');
    } catch (error) {
        await transaction.rollback();
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const declineRegisterShopById = async (shopId) => {
    const transaction = await sequelize.transaction();

    try {
        const existShop = await db.Shop.findOne({
            where: { id: shopId },
            include: [
                {
                    model: db.User,
                    as: 'user',
                    attributes: ['id', 'name', 'image_url', 'roles']
                }
            ]
        });

        if (!existShop) {
            ResponseModel.error(HttpErrors.NOT_FOUND, 'Không tìm thấy cửa hàng.', {});
        }

        if (existShop.status !== ShopStatus.PENDING) {
            return ResponseModel.error(HttpErrors.BAD_REQUEST, 'Chỉ có thể từ chối đơn đăng ký ở trạng thái pending.', {});
        }

        const { background_url, logo_url, user } = existShop;
        await handleDeleteImages([background_url, logo_url, user?.image_url ?? '']);

        await existShop.user.update({
            roles: UserRoles.CUSTOMER,
            shopId: null
        }, { transaction })

        await db.Shop.destroy({
            where: { id: shopId },
            transaction
        });

        sendDeclineStoreMailer(
            "buikienduy2020@gmail.com",
            existShop.user?.name ?? '',
            existShop.shop_name ?? '',
            "buikienduy2020@gmail.com"
        );

        await transaction.commit();

        return ResponseModel.success('Bác bỏ đơn đăng ký cửa hàng');
    } catch (error) {
        await transaction.rollback();
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

export const fetchProductsByParentCategoryInShop = async (
    shop_id,
    parent_category_id,
    page = 1,
    limit = 10
) => {
    try {
        if (!shop_id | !parent_category_id) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, "Thiếu thông tin cần thiết", {
                shop_id: shop_id ?? '',
                parent_category_id: parent_category_id ?? ''
            });
        }

        if (page < 1 || limit < 1) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Page và limit phải là số dương', { page, limit });
        }

        const offset = (page - 1) * limit;

        /** Subquery để lấy danh sách categoryId của danh mục con */
        const childCategoryIdsSubquery = sequelize.literal(`(
            SELECT id 
            FROM Categories
            WHERE parentId = :parent_category_id    
        )`);

        /** Đếm tổng số sản phẩm */
        const totalItems = await db.Product.count({
            where: {
                shopId: shop_id,
                categoryId: {
                    [Op.in]: childCategoryIdsSubquery,
                }
            },
            replacements: { parent_category_id }
        });

        /** Subquery để tính rating trung bình */
        const ratingSubquery = sequelize.literal(`(
            SELECT AVG(rating)
            FROM Reviews
            WHERE Reviews.product_id = Product.id
        )`);

        /** Lấy danh sách sản phẩm */
        const products = await db.Product.findAll({
            where: {
                shopId: shop_id,
                categoryId: {
                    [Op.in]: childCategoryIdsSubquery
                }
            },
            replacements: { parent_category_id },
            attributes: [
                'id',
                'product_name',
                'unit_price',
                'sold_quantity',
                'description',
                'gender',
                'origin',
                [ratingSubquery, 'rating']
            ],
            include: [
                {
                    model: db.ProductImages,
                    as: 'product_images',
                    attributes: ['id', 'image_url'],
                    required: false
                },
                {
                    model: db.Shop,
                    as: 'shop',
                    attributes: ['id', 'shop_name', 'logo_url'],
                },
            ],
            limit,
            offset,
        });

        const totalPages = Math.ceil(totalItems / limit);
        const paginate = {
            currentPage: page,
            limit: limit,
            totalItems: totalItems,
            totalPages: totalPages
        }

        const payload = {
            products: products,
            pagination: paginate
        }

        return ResponseModel.success('Danh sách sản phẩm thuộc danh mục cha', payload);
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const withdrawalMoneyByOwner = async (userId, tokenShopId, { shopId, amount, password }) => {
    const transaction = await sequelize.transaction();
    try {
        if (shopId !== tokenShopId) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Không có quyền truy cập cửa hàng này', {});
        }

        const shop = await db.Shop.findByPk(tokenShopId, { transaction });

        if (!shop) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Cửa hàng không tồn tại', {});
        }

        if (shop.lock_until && shop.lock_until > new Date()) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Tài khoản đã bị khóa trong 1 ngày kể từ lúc lệnh khóa có hiệu lực', {});
        }

        const user = await db.User.findOne({
            where: { id: userId, roles: UserRoles.OWNER },
            transaction: transaction
        })

        if (!user) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Tài khoản không tồn tại hoặc không phải chủ cửa hàng', {});
        }

        const isPasswordValid = comparePassword(password, user.password);
        if (!isPasswordValid) {
            const newAttempts = shop.failed_attempts + 1;
            let lockUntil = null;
            if (newAttempts >= 3) {
                lockUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
            }
            console.log(':' + newAttempts);
            await shop.update(
                { failed_attempts: newAttempts, lock_until: lockUntil },
            );

            ResponseModel.error(HttpErrors.BAD_REQUEST, `Sai mật khẩu. Còn ${3 - newAttempts} lần thử.`, {});
        }

        // Reset số lần nhập sai nếu mật khẩu đúng
        if (shop.failed_attempts > 0) {
            await shop.update({
                failed_attempts: 0,
                lock_until: null
            })
        }

        if (shop.balance < 1000000) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Số dư phải từ 1 triệu trở lên', {});
        }

        if (shop.balance < amount) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Số dư rút không đủ', {});
        }

        const newWithdrawal = await db.Withdrawal.create({
            shop_id: shopId,
            amount
        }, { transaction });

        await shop.update({ balance: shop.balance - amount }, { transaction });

        await transaction.commit();

        return ResponseModel.success('Rút tiền thành công', {
            newWithdrawal
        })
    } catch (error) {
        await transaction.rollback();
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const fetchListWithdrawalHistories = async (tokenShopId) => {
    const transaction = await sequelize.transaction();
    try {
        const shop = await db.Shop.findByPk(tokenShopId, { transaction });

        if (!shop) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Cửa hàng không tồn tại', {});
        }

        const withdrawals = await db.Withdrawal.findAll({
            where: {
                shop_id: tokenShopId
            },
            order: [['createdAt', 'DESC']]
        });

        await transaction.commit();

        return ResponseModel.success('Lịch sử giao dịch', {
            withdrawals: withdrawals
        })
    } catch (error) {
        await transaction.rollback();
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const fetchBalanceShop = async (tokenUserId, tokenShopId) => {
    const transaction = await sequelize.transaction();
    try {
        console.log(tokenShopId);
        const user = await db.User.findOne({
            where: {
                id: tokenUserId,
                roles: UserRoles.OWNER
            },
            transaction
        });

        if (!user) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Người dùng không tồn tại hoặc không phải chủ cửa hàng', {});
        }

        if (user.shopId !== tokenShopId) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Không có quyền truy cập cửa hàng này', {});
        }

        const shop = await db.Shop.findByPk(tokenShopId, { transaction });

        if (!shop) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Cửa hàng không tồn tại', {});
        }

        await transaction.commit();

        return ResponseModel.success('Balance của cửa hàng', {
            balance: shop.balance
        })
    } catch (error) {
        await transaction.rollback();
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}