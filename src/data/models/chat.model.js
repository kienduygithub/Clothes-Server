'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Chat extends Model {
        static associate(models) {
            Chat.belongsTo(models.User, {
                foreignKey: 'senderId',
                as: 'sender',
                onDelete: 'CASCADE'
            });
            Chat.belongsTo(models.User, {
                foreignKey: 'receiverId',
                as: 'receiver',
                onDelete: 'CASCADE'
            });
        }
    }

    Chat.init({
        senderId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            },
            onDelete: 'CASCADE'
        },
        receiverId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            },
            onDelete: 'CASCADE'
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        isRead: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    }, {
        sequelize,
        modelName: 'Chat',
    });

    return Chat;
};