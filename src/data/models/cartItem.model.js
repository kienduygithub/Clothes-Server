'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class CartItem extends Model {
        static associate(models) {
            CartItem.belongsTo(models.Cart, {
                foreignKey: 'cart_id',
                as: 'cart',
                onDelete: 'CASCADE'
            })

            CartItem.belongsTo(models.ProductVariant, {
                foreignKey: 'product_variant_id',
                as: 'product_variant',
                onDelete: 'CASCADE'
            })
        }
    }
    CartItem.init({
        cart_id: {
            type: DataTypes.INTEGER,
            references: {
                model: 'carts',
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
        unit_price: DataTypes.DECIMAL(10, 2),
        order_quantity: DataTypes.INTEGER
    }, {
        sequelize,
        modelName: 'CartItem',
    });
    return CartItem;
};