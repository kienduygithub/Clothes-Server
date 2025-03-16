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
        }
    }, {
        sequelize,
        modelName: 'CartShop',
    });
    return CartShop;
};