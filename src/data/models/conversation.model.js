'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Conversation extends Model {
        static associate(models) {
            Conversation.belongsTo(models.User, {
                foreignKey: 'userId',
                as: 'user',
                onDelete: 'CASCADE'
            });
            Conversation.belongsTo(models.User, {
                foreignKey: 'otherUserId',
                as: 'otherUser',
                onDelete: 'CASCADE'
            });
            Conversation.belongsTo(models.Chat, {
                foreignKey: 'lastMessageId',
                as: 'lastMessage',
                onDelete: 'SET NULL'
            });
        }
    }
    Conversation.init({
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            },
            onDelete: 'CASCADE'
        },
        otherUserId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            },
            onDelete: 'CASCADE'
        },
        lastMessageId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'Chat',
                key: 'id'
            },
            onDelete: 'SET NULL'
        },
        unreadCount: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        }
    }, {
        sequelize,
        modelName: 'Conversation',
        indexes: [
            { unique: true, fields: ['userId', 'otherUserId'] }
        ]
    });
    return Conversation;
};