'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class ProductVariant extends Model {
        static associate(models) {
            ProductVariant.belongsTo(models.Product, {
                foreignKey: 'productId',
                as: 'product'
            });
            ProductVariant.belongsTo(models.Color, {
                foreignKey: 'colorId',
                as: 'color',
                onDelete: 'SET NULL'
            });
            ProductVariant.belongsTo(models.Size, {
                foreignKey: 'sizeId',
                as: 'size',
                onDelete: 'SET NULL'
            });
        }
    }
    ProductVariant.init({
        productId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        colorId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        sizeId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        image_url: {
            type: DataTypes.STRING,
            allowNull: true
        },
        sku: DataTypes.STRING,
        stock_quantity: DataTypes.INTEGER,
    }, {
        sequelize,
        modelName: 'ProductVariant',
    });
    return ProductVariant;
};