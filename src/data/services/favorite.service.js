import HttpErrors from '../../common/errors/http-errors';
import { ResponseModel } from '../../common/errors/response';
import { Favorite, Product, User, Category, sequelize } from '../models';

export const fetchFavoritesByUser = async (user_id) => {
    const t = await sequelize.transaction();
    try {
        if (!user_id) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                user_id: user_id ?? ''
            });
        }

        const favorites = await Favorite.findAndCountAll({
            where: { user_id: user_id },
            attributes: { exclude: ['createdAt', 'updatedAt'] },
            include: [
                {
                    model: Product,
                    as: 'product',
                    attributes: { exclude: ['createdAt', 'updatedAt'] },
                    include: [
                        {
                            model: Category,
                            as: 'category',
                            attributes: ['id', 'category_name'],
                            include: [
                                {
                                    model: Category,
                                    as: 'parent',
                                    attributes: { exclude: ['description', 'parentId', 'createdAt', 'updatedAt'] },
                                }
                            ]
                        }
                    ]
                },
            ],
            transaction: t
        });

        const payload = {
            favorites: favorites.rows,
            count: favorites.count
        }

        await t.commit();

        return ResponseModel.success('Danh sách Favorite người dùng', payload);
    } catch (error) {
        await t.rollback();
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const favoriteProductByUser = async (user_id, product_id) => {
    const t = await sequelize.transaction();
    try {
        if (!user_id || !product_id) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                user_id: user_id ?? '',
                product_id: product_id ?? ''
            });
        }

        const product = await Product.findOne({
            where: { id: product_id },
            transaction: t
        })

        if (!product) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Sản phẩm không tồn tại', {});
        }

        await Favorite.create({
            user_id: user_id,
            product_id: product_id
        }, { transaction: t });

        await t.commit();

        return ResponseModel.success('Yêu thích sản phẩm thành công', {});
    } catch (error) {
        await t.rollback();
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const unfavoriteProductByUser = async (user_id, product_id) => {
    const t = await sequelize.transaction();
    try {
        if (!user_id || !product_id) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                user_id: user_id ?? '',
                product_id: product_id ?? ''
            });
        }

        const favorite = await Favorite.findOne({
            where: { user_id: user_id, product_id: product_id },
            transaction: t
        })

        if (!favorite) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Yêu thích sản phẩm không tồn tại', {});
        }

        await Favorite.destroy({
            where: { user_id: user_id, product_id: product_id },
            transaction: t
        });

        await t.commit();

        return ResponseModel.success('Bỏ yêu thích sản phẩm thành công', {});
    } catch (error) {
        await t.rollback();
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}