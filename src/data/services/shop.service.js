import HttpErrors from '../../common/errors/http-errors';
import { ResponseModel } from '../../common/errors/response';
import { handleDeleteImageAsFailed, handleDeleteImages } from '../../common/middleware/upload.middleware';
import { ShopStatus } from '../../common/utils/status';
import db from '../models';

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
            where: { id: shopId }
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