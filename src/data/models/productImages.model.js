'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class ProductImages extends Model {
        static associate(models) {
            ProductImages.belongsTo(models.Product, {
                foreignKey: 'productId',
                as: 'product'
            });
        }
    }
    ProductImages.init({
        productId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        image_url: {
            type: DataTypes.STRING,
            allowNull: false
        },
    }, {
        sequelize,
        modelName: 'ProductImages',
    });
    return ProductImages;
};