'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class CartItem extends Model {
        static associate(models) {
            CartItem.belongsTo(models.CartShop, {
                foreignKey: 'cart_shop_id',
                as: 'cart_shop',
                onDelete: 'CASCADE'
            });

            CartItem.belongsTo(models.ProductVariant, {
                foreignKey: 'product_variant_id',
                as: 'product_variant',
                onDelete: 'CASCADE'
            });
        }
    }
    CartItem.init({
        cart_shop_id: {
            type: DataTypes.INTEGER,
            references: {
                model: 'cartshops',
                key: 'id'
            },
            allowNull: false,
            onDelete: 'CASCADE'
        },
        product_variant_id: {
            type: DataTypes.INTEGER,
            references: {
                model: 'productvariants',
                key: 'id'
            },
            allowNull: false,
            onDelete: 'CASCADE'
        },
        quantity: DataTypes.INTEGER
    }, {
        sequelize,
        modelName: 'CartItem',
    });
    return CartItem;
};