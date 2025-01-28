'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Order extends Model {
        static associate(models) {

        }
    }
    Order.init({
        userId: DataTypes.INTEGER,
        shipping_fee: DataTypes.DECIMAL(10, 2),
        payable_price: DataTypes.DECIMAL(10, 2),
        total_price: DataTypes.DECIMAL(10, 2),
        status: DataTypes.ENUM('pending', 'paid', 'canceled'),
        status_changed_at: DataTypes.DATE,
        payment_date: DataTypes.DATE,
    }, {
        sequelize,
        modelName: 'Order',
    });
    return Order;
};