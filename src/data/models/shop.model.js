'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Shop extends Model {
        static associate(models) {
            Shop.hasOne(models.User, {
                foreignKey: 'shopId',
                as: 'user',
                onDelete: 'CASCADE'
            });
            Shop.hasMany(models.Product, {
                foreignKey: 'shopId',
                as: 'products'
            });
        }
    }
    Shop.init({
        shop_name: DataTypes.STRING,
        logo_url: DataTypes.STRING,
        background_url: DataTypes.STRING,
        contact_email: DataTypes.STRING,
        contact_address: DataTypes.STRING,
        description: DataTypes.TEXT('medium'),
        status: DataTypes.ENUM('active', 'inactive', 'pending')
    }, {
        sequelize,
        modelName: 'Shop',
    });
    return Shop;
};