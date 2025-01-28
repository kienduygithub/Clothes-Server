'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class CartItem extends Model {
        static associate(models) {

        }
    }
    CartItem.init({
        cartId: DataTypes.INTEGER,
        productId: DataTypes.INTEGER,
        colorId: DataTypes.INTEGER,
        sizeId: DataTypes.INTEGER,
        unit_price: DataTypes.DECIMAL(10, 2),
        order_quantity: DataTypes.INTEGER
    }, {
        sequelize,
        modelName: 'CartItem',
    });
    return CartItem;
};