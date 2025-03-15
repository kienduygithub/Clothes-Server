'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Order extends Model {
        static associate(models) {
            // Địa chỉ Address
            Order.belongsTo(models.Address, {
                foreignKey: 'address_id',
                as: 'address',
                onDelete: "SET NULL",
            });
            // Người dùng
            Order.belongsTo(models.User, {
                foreignKey: 'user_id',
                onDelete: "CASCADE",
                onUpdate: "CASCADE"
            });
            // Đơn mục đơn hàng
            Order.hasMany(models.OrderItem, {
                foreignKey: 'order_id',
                as: 'items',
                onDelete: "CASCADE",
                onUpdate: "CASCADE"
            });
        }
    }
    Order.init({
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
        },
        address_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'addresses',
                key: 'id'
            },
            onDelete: 'SET NULL',
        },
        shipping_fee: DataTypes.DECIMAL(10, 2),
        payable_price: DataTypes.DECIMAL(10, 2),
        total_price: DataTypes.DECIMAL(10, 2),
        status: DataTypes.ENUM('pending', 'confirmed', 'shipped', 'delivered', 'canceled'),
        status_changed_at: DataTypes.DATE,
        payment_date: DataTypes.DATE,
    }, {
        sequelize,
        modelName: 'Order',
    });
    return Order;
};