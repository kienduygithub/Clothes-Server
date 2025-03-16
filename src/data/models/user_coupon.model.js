'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class UserCoupon extends Model {
        static associate(models) {
            UserCoupon.belongsTo(models.User, {
                foreignKey: 'user_id',
                as: 'user',
                onDelete: 'CASCADE'
            });
            UserCoupon.belongsTo(models.Coupon, {
                foreignKey: 'coupon_id',
                as: 'coupon',
                onDelete: 'CASCADE'
            });
        }
    }
    UserCoupon.init({
        user_id: {
            type: DataTypes.INTEGER,
            references: {
                model: 'users',
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
            allowNull: false,
            onDelete: 'CASCADE'
        },
        is_used: DataTypes.BOOLEAN
    }, {
        sequelize,
        modelName: 'UserCoupon',
    });
    return UserCoupon;
};