'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class OrderShop extends Model {
        static associate(models) {
            // OrderShop N - 1 Order
            OrderShop.belongsTo(models.Order, {
                foreignKey: 'order_id',
                as: 'order',
                onDelete: 'CASCADE'
            });
            // OrderShop N - 1 Shop
            OrderShop.belongsTo(models.Shop, {
                foreignKey: 'shop_id',
                as: 'shop',
                onDelete: 'CASCADE'
            });
            // OrderShop 1 - 1 Coupon
            OrderShop.belongsTo(models.Coupon, {
                foreignKey: 'coupon_id',
                as: 'coupon',
                onDelete: 'SET NULL'
            });
            // OrderShop 1 - N OrderItem
            OrderShop.hasMany(models.OrderItem, {
                foreignKey: 'order_shop_id',
                as: 'order_shop_items',
                onDelete: 'CASCADE'
            });
        }
    }
    OrderShop.init({
        order_id: {
            type: DataTypes.INTEGER,
            references: {
                model: 'orders',
                key: 'id'
            },
            allowNull: false,
            onDelete: 'CASCADE'
        },
        shop_id: {
            type: DataTypes.INTEGER,
            references: {
                model: 'shops',
                key: 'id'
            },
            allowNull: false,
            onDelete: 'CASCADE'
        },
        coupon_id: {
            type: DataTypes.INTEGER,
            references: {
                model: 'coupons',
                key: 'id'
            },
            allowNull: true, // Có thể không dùng coupon
            onDelete: 'SET NULL'
        },
        status: DataTypes.ENUM(
            'pending',
            'paid',
            'shipped',
            'completed',
            'canceled',
            'processing'
        ),
        subtotal: DataTypes.DECIMAL(10, 2),
        discount: DataTypes.DECIMAL(10, 2),
        final_total: DataTypes.DECIMAL(10, 2),
    }, {
        sequelize,
        modelName: 'OrderShop',
    });
    return OrderShop;
};