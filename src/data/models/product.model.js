'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Product extends Model {
        static associate(models) {
            Product.belongsTo(models.Shop, {
                foreignKey: 'shopId',
                as: 'shop',
                onDelete: 'CASCADE'
            });
            Product.hasMany(models.ProductVariant, {
                foreignKey: 'productId',
                as: 'variants',
                onDelete: 'CASCADE'
            });
            Product.hasMany(models.Review, {
                foreignKey: 'productId',
                as: 'reviews',
                onDelete: 'CASCADE'
            });
            Product.belongsToMany(models.Category, {
                through: models.ProductCategory,
                foreignKey: 'productId',
                otherKey: 'categoryId',
                as: 'categories'
            });
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
        product_name: DataTypes.STRING,
        origin: DataTypes.STRING,
        gender: DataTypes.ENUM('Male', 'Female', 'Unisex', 'Kids', 'Other'),
        description: DataTypes.STRING,
        sold_quantity: DataTypes.INTEGER,
        unit_price: DataTypes.DECIMAL(10, 2),
    }, {
        sequelize,
        modelName: 'Product',
    });
    return Product;
};