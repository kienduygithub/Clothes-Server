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
        type: DataTypes.ENUM("Drawback", "Order", "Product"),
        title: DataTypes.STRING,
        message: DataTypes.STRING,
        is_read: DataTypes.BOOLEAN
    }, {
        sequelize,
        modelName: 'Notification',
    });
    return Notification;
};