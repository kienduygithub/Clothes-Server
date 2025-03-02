'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class OrderItem extends Model {
        static associate(models) {
            OrderItem.belongsTo(models.Order, {
                foreignKey: 'orderId',
                as: 'order',
                onDelete: "CASCADE",
            });

            // Một OrderItem thuộc về một Product
            // OrderItem.belongsTo(models.Product, {
            //     foreignKey: 'productId',
            //     onDelete: "CASCADE",
            //     onUpdate: "CASCADE"
            // });
        }
    }
    OrderItem.init({
        orderId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'orders',
                key: 'id'
            },
            onDelete: 'CASCADE'
        },
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