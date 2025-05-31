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
            Chat.hasMany(models.Conversation, {
                foreignKey: 'lastMessageId',
                as: 'conversations',
                onDelete: 'SET NULL'
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
        messageType: {
            type: DataTypes.ENUM('text', 'image', 'file'),
            allowNull: false,
            defaultValue: 'text'
        },
        attachments: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: null,
            get() {
                const rawValue = this.getDataValue('attachments');
                return rawValue ? JSON.parse(rawValue) : null;
            },
            set(value) {
                this.setDataValue('attachments', value ? JSON.stringify(value) : null);
            }
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