'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Size extends Model {
        static associate(models) {
            Size.hasMany(models.ProductVariant, {
                foreignKey: 'sizeId',
                onDelete: 'SET NULL'
            });
        }
    }
    Size.init({
        size_code: DataTypes.ENUM('S', 'M', 'L', 'XL', 'XXL'),
        order_sequence: DataTypes.TINYINT,
    }, {
        sequelize,
        modelName: 'Size',
    });
    return Size;
};