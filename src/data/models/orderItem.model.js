'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class OrderItem extends Model {
        static associate(models) {

        }
    }
    OrderItem.init({
        orderId: DataTypes.INTEGER,
        productId: DataTypes.INTEGER,
        colorId: DataTypes.INTEGER,
        sizeId: DataTypes.INTEGER,
        unit_price: DataTypes.DECIMAL(10, 2),
        order_quantity: DataTypes.INTEGER
    }, {
        sequelize,
        modelName: 'OrderItem',
    });
    return OrderItem;
};