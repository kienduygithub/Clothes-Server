'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Shop extends Model {
        static associate(models) {
            // Shop 1 - 1 User
            Shop.hasOne(models.User, {
                foreignKey: 'shopId',
                as: 'user',
                onDelete: 'CASCADE'
            });
            // Shop 1 - N Product
            Shop.hasMany(models.Product, {
                foreignKey: 'shopId',
                as: 'products',
                onDelete: 'CASCADE'
            });
            // Shop 1 - N Coupon
            Shop.hasMany(models.Coupon, {
                foreignKey: 'shop_id',
                as: 'coupons',
                onDelete: 'CASCADE'
            })
            // Shop 1 - N OrderShop
            Shop.hasMany(models.OrderShop, {
                foreignKey: 'order_shop_id',
                as: 'order_shops',
                onDelete: 'CASCADE'
            });
            // Shop 1 - N CartShop
            Shop.hasMany(models.CartShop, {
                foreignKey: 'shop_id',
                as: 'cart_shops',
                onDelete: 'CASCADE'
            });
            Shop.hasMany(models.Withdrawal, {
                foreignKey: 'shop_id',
                as: 'withdrawals',
                onDelete: 'CASCADE'
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
        status: DataTypes.ENUM('active', 'inactive', 'pending'),

        balance: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0
        },
        failed_attempts: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        lock_until: {
            type: DataTypes.DATE,
            allowNull: true
        },
        statusChangedAt: {
            type: DataTypes.DATE,
            allowNull: true
        }
    }, {
        sequelize,
        modelName: 'Shop',
    });
    return Shop;
};