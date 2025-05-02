import HttpErrors from '../../common/errors/http-errors';
import { ResponseModel } from '../../common/errors/response';
import { Favorite, Product, ProductImages, User, Category, Review, sequelize } from '../models';

export const fetchFavoritesByUser = async (user_id) => {
    const t = await sequelize.transaction();
    try {
        if (!user_id) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                user_id: user_id ?? ''
            });
        }

        // Subquery tính rating trung bình
        const avgRating = sequelize.literal(`(
            SELECT AVG(rating)
            FROM Reviews
            WHERE Reviews.product_id = Product.id
        )`);

        const favoriteProducts = await Product.findAndCountAll({
            attributes: [
                'id',
                'product_name',
                'unit_price',
                'sold_quantity',
                'origin',
                [avgRating, 'rating']
            ],
            include: [
                {
                    model: Category,
                    as: 'category',
                    attributes: ['id', 'category_name'],
                    include: [
                        {
                            model: Category,
                            as: 'parent',
                            attributes: ['id', 'category_name']
                        }
                    ]
                },
                {
                    model: ProductImages,
                    as: 'product_images',
                    attributes: ['image_url'],
                    required: false
                },
                {
                    model: Favorite,
                    as: 'product_favorites',
                    where: { user_id: user_id },
                    attributes: ['user_id'],
                    required: true
                },
                {
                    model: Review,
                    as: 'reviews',
                    attributes: [],
                    required: false
                }
            ],
            distinct: true,
            transaction: t
        });

        const payload = {
            products: favoriteProducts.rows,
        }

        await t.commit();

        return ResponseModel.success('Danh sách sản phẩm yêu thích', payload);
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