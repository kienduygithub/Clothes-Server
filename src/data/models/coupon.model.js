'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Coupon extends Model {
        static associate(models) {
            // Cửa hàng 1 - N Coupon
            Coupon.belongsTo(models.Shop, {
                foreignKey: 'shop_id',
                as: 'shop',
                onDelete: 'CASCADE'
            });
            // Coupon 1 - N UserCoupon: Một mã có nhiều người sử dụng -> Coupon N - N User
            Coupon.belongsToMany(models.User, {
                through: models.UserCoupon,
                foreignKey: 'coupon_id',
                otherKey: 'user_id'
            });
            // Coupon 1 - 1 OrderShop: Một mã chỉ sử dụng trên một đơn hàng cửa hàng
            Coupon.hasOne(models.OrderShop, {
                foreignKey: 'coupon_id',
                as: 'order_shop',
                onDelete: 'SET NULL'
            });
        }
    }
    Coupon.init({
        shop_id: {
            type: DataTypes.INTEGER,
            references: {
                model: 'shops',
                key: 'id'
            },
            allowNull: false,
            onDelete: 'CASCADE'
        },
        code: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        discount_type: DataTypes.ENUM('percentage', 'fixed'),
        discount_value: DataTypes.DECIMAL(10, 2),
        max_discount: DataTypes.DECIMAL(10, 2),
        min_order_value: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        times_used: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        max_usage: {
            type: DataTypes.INTEGER,
            allowNull: true // Null nếu không giới hạn số lần sử dụng
        },
        valid_from: DataTypes.DATE,
        valid_to: DataTypes.DATE
    }, {
        sequelize,
        modelName: 'Coupon',
    });
    return Coupon;
};