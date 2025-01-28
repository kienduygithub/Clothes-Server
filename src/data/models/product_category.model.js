'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class ProductCategory extends Model {
        static associate(models) {
            ProductCategory.belongsTo(models.Product, {
                foreignKey: 'productId',
                as: 'product'
            });
            ProductCategory.belongsTo(models.Category, {
                foreignKey: 'categoryId',
                as: 'category'
            });
        }
    }
    ProductCategory.init({
        productId: DataTypes.INTEGER,
        categoryId: DataTypes.INTEGER,
    }, {
        sequelize,
        modelName: 'ProductCategory',
    });
    return ProductCategory;
};