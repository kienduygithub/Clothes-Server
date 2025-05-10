'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Notification extends Model {
        static associate(models) {
            Notification.belongsTo(models.User, {
                foreignKey: 'user_id',
                as: 'user',
                onDelete: 'CASCADE'
            })
        }
    }
    Notification.init({
        user_id: {
            type: DataTypes.INTEGER,
            references: {
                model: 'users',
                key: 'id'
            },
            allowNull: false,
            onDelete: 'CASCADE'
        },
        roles: DataTypes.ENUM('Admin', 'Owner', 'Customer'),
        type: DataTypes.ENUM(
            'ORDER_NEW',
            'ORDER_CANCELED',
            'STORE_REGISTRATION_REQUEST',
            'STORE_REGISTRATION_REJECTED',
            'PRODUCT_LOW_STOCK'
        ),
        reference_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        reference_type: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        data: {
            type: DataTypes.JSON, /** Lưu thêm thông tin bổ sung **/
            allowNull: true,
        },
        action: {
            type: DataTypes.STRING,
            allowNull: true
        },
        is_read: DataTypes.BOOLEAN
    }, {
        sequelize,
        modelName: 'Notification',
    });
    return Notification;
};