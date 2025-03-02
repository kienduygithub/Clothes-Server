'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Order extends Model {
        static associate(models) {
            // Order.belongsTo(models.Address, {
            //     foreignKey: 'addressId',
            //     onDelete: "SET NULL",
            //     onUpdate: "CASCADE"
            // });

            Order.belongsTo(models.User, {
                foreignKey: 'userId',
                onDelete: "CASCADE",
                onUpdate: "CASCADE"
            });

            Order.hasMany(models.OrderItem, {
                foreignKey: 'orderId',
                as: 'items',
                onDelete: "CASCADE",
                onUpdate: "CASCADE"
            });
        }
    }
    Order.init({
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users', key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
        },
        // addressId: {
        //     type: DataTypes.INTEGER,
        //     allowNull: true,
        //     references: {
        //         model: 'addresses', key: 'id'
        //     },
        //     onUpdate: 'CASCADE',
        //     onDelete: 'SET NULL',
        // },
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