import HttpErrors from '../../common/errors/http-errors';
import { ResponseModel } from '../../common/errors/response';
import db from '../models';

const fetchAllProductsInShop = async (shopId) => {
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

const fetchAllShop = async (req, res) => {
    try {
        const response = await db.Shop.findAll({
            include: [
                {
                    model: db.User,
                    as: 'users',
                    attributes: ['id', 'name', 'email', 'phone', 'address']
                }
            ],
            attributes: {
                exclude: ['updatedAt']
            }
        });
        const payload = {
            shops: response
        };
        return ResponseModel.success('Danh sách cửa hàng', payload);
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

const createNewShop = async (payload) => {
    try {
        const {
            shop_name,
            logo_url,
            contact_email,
            contact_address,
            description
        } = payload;

        if (!shop_name) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu trường cần thiết');
        }
        await db.Shop.create({
            shop_name: shop_name,
            logo_url: logo_url ?? '',
            contact_email: contact_email ?? '',
            contact_address: contact_address ?? '',
            description: description ?? ''
        });

        return ResponseModel.success('Tạo cửa hàng thành công.');
    } catch (error) {
        console.log(error);
        ResponseModel.error(error.status, error.message, error?.body);
    }
}

const updateShopById = async (shopId, payload) => {
    try {
        const existShop = await db.Shop.findOne({
            where: { id: shopId }
        });

        if (!existShop) {
            ResponseModel.error(HttpErrors.NOT_FOUND, `Không tìm thấy cửa hảng.`);
        }

        const {
            shop_name,
            logo_url,
            contact_email,
            contact_address,
            description
        } = payload;

        if (!shop_name) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu trường cần thiết',);
        };

        await existShop.update({
            shop_name: shop_name,
            logo_url: logo_url,
            contact_email: contact_email,
            contact_address: contact_address,
            description: description,
        });

        return ResponseModel.success('Cập nhật thành công');
    } catch (error) {
        ResponseModel.error(error.status, error?.message);
    }
}

const deleteShopById = async (shopId) => {
    try {
        const existShop = await db.Shop.findOne({
            where: { id: shopId }
        });

        if (!existShop) {
            ResponseModel.error(HttpErrors.NOT_FOUND, 'Không tìm thấy cửa hàng.');
        }

        await db.Shop.destroy({
            where: { id: shopId }
        });

        return ResponseModel.success('Xóa cửa hàng thành công.');
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

module.exports = {
    fetchAllProductsInShop: fetchAllProductsInShop,
    fetchAllShop: fetchAllShop,
    createNewShop: createNewShop,
    updateShopById: updateShopById,
    deleteShopById: deleteShopById
}