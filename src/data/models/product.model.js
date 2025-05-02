'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Product extends Model {
        static associate(models) {
            // Cửa hàng
            Product.belongsTo(models.Shop, {
                foreignKey: 'shopId',
                as: 'shop',
                onDelete: 'CASCADE'
            });
            // Biến thể variant
            Product.hasMany(models.ProductVariant, {
                foreignKey: 'productId',
                as: 'variants',
                onDelete: 'CASCADE'
            });
            // Review
            // Product.belongsToMany(models.User, {
            //     through: models.Review,
            //     foreignKey: 'product_id',
            //     otherKey: 'user_id'
            // });
            Product.hasMany(models.Review, {
                foreignKey: 'product_id',
                as: 'reviews'
            });
            // Favorite
            Product.belongsToMany(models.User, {
                through: models.Favorite,
                foreignKey: 'product_id',
                otherKey: 'user_id',
            });
            Product.hasMany(models.Favorite, {
                foreignKey: 'product_id',
                as: 'product_favorites',
                onDelete: 'CASCADE'
            });
            // Danh mục sản phẩm
            Product.belongsTo(models.Category, {
                foreignKey: 'categoryId',
                as: 'category',
                onDelete: 'SET NULL'
            });
            // Hình ảnh sản phẩm
            Product.hasMany(models.ProductImages, {
                foreignKey: 'productId',
                as: 'product_images',
                onDelete: 'CASCADE'
            });
        }
    }
    Product.init({
        shopId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        categoryId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        product_name: DataTypes.STRING,
        origin: DataTypes.STRING,
        gender: DataTypes.ENUM('Male', 'Female', 'Unisex', 'Kids', 'Other'),
        description: DataTypes.TEXT('medium'),
        sold_quantity: DataTypes.INTEGER,
        unit_price: DataTypes.DECIMAL(10, 2),
    }, {
        sequelize,
        modelName: 'Product',
        timestamps: true,
    });
    return Product;
};