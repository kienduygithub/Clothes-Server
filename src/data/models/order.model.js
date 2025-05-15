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
                as: 'user',
                onDelete: "CASCADE",
            });
            // Danh sách Order của từng Shop
            Order.hasMany(models.OrderShop, {
                foreignKey: 'order_id',
                as: 'order_shops',
                onDelete: 'CASCADE'
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
        total_price: DataTypes.DECIMAL(10, 2),
        status: DataTypes.ENUM(
            'pending',
            'paid',
            'shipped',
            'completed',
            'canceled',
            'processing'
        ),
        status_changed_at: DataTypes.DATE,
        payment_date: DataTypes.DATE,
    }, {
        sequelize,
        modelName: 'Order',
    });
    return Order;
};