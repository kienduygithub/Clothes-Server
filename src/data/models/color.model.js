'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Color extends Model {
        static associate(models) {
            Color.hasMany(models.ProductVariant, {
                foreignKey: 'colorId',
                onDelete: 'SET NULL'
            })
        }
    }
    Color.init({
        color_name: DataTypes.STRING,
        color_code: DataTypes.STRING
    }, {
        sequelize,
        modelName: 'Color',
    });
    return Color;
};