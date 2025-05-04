'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class OrderItem extends Model {
        static associate(models) {
            OrderItem.belongsTo(models.OrderShop, {
                foreignKey: 'order_shop_id',
                as: 'order_shop',
                onDelete: "CASCADE",
            });

            OrderItem.belongsTo(models.ProductVariant, {
                foreignKey: 'product_variant_id',
                as: 'product_variant',
                onDelete: "CASCADE",
            });

            OrderItem.hasOne(models.Review, {
                foreignKey: 'order_item_id',
                as: 'review_order_item',
                onDelete: 'CASCADE'
            });
        }
    }
    OrderItem.init({
        order_shop_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'ordershops',
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
        quantity: DataTypes.INTEGER
    }, {
        sequelize,
        modelName: 'OrderItem',
    });
    return OrderItem;
};