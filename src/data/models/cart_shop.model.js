'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class CartShop extends Model {
        static associate(models) {
            CartShop.belongsTo(models.Cart, {
                foreignKey: 'cart_id',
                as: 'cart',
                onDelete: 'CASCADE'
            });
            CartShop.belongsTo(models.Shop, {
                foreignKey: 'shop_id',
                as: 'shop',
                onDelete: 'CASCADE'
            });
            CartShop.hasMany(models.CartItem, {
                foreignKey: 'cart_shop_id',
                as: 'cart_items',
                onDelete: 'CASCADE'
            });
            CartShop.belongsTo(models.Coupon, {
                foreignKey: 'coupon_id',
                as: 'selected_coupon',
                onDelete: 'SET NULL'
            })
        }
    }
    CartShop.init({
        cart_id: {
            type: DataTypes.INTEGER,
            references: {
                model: 'carts',
                key: 'id'
            },
            allowNull: false,
            onDelete: 'CASCADE'
        },
        shop_id: {
            type: DataTypes.INTEGER,
            references: {
                model: 'shops',
                key: 'id'
            },
            allowNull: false,
            onDelete: 'CASCADE'
        },
        coupon_id: {
            type: DataTypes.INTEGER,
            references: {
                model: 'coupons',
                key: 'id'
            },
            allowNull: true,
            onDelete: 'SET NULL'
        }
    }, {
        sequelize,
        modelName: 'CartShop',
    });
    return CartShop;
};