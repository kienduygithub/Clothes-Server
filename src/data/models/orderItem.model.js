'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class OrderItem extends Model {
        static associate(models) {
            OrderItem.belongsTo(models.Order, {
                foreignKey: 'order_id',
                as: 'order',
                onDelete: "CASCADE",
            });

            OrderItem.belongsTo(models.ProductVariant, {
                foreignKey: 'product_variant_id',
                as: 'product_variant',
                onDelete: "CASCADE",
            });
        }
    }
    OrderItem.init({
        order_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'orders',
                key: 'id'
            },
            onDelete: 'CASCADE'
        },
        product_variant_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'productvariants',
                key: 'id'
            },
            onDelete: 'CASCADE'
        },
        unit_price: DataTypes.DECIMAL(10, 2),
        order_quantity: DataTypes.INTEGER
    }, {
        sequelize,
        modelName: 'OrderItem',
    });
    return OrderItem;
};