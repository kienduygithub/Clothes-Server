'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class ChatSession extends Model {
        static associate(models) {
            ChatSession.hasMany(models.ChatHistory, {
                foreignKey: 'session_id',
                sourceKey: 'session_id'
            });
            ChatSession.belongsTo(models.User, {
                foreignKey: 'user_id'
            });
        }
    }
    ChatSession.init({
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: true, // null cho guest
            references: {
                model: 'users',
                key: 'id'
            }
        },
        session_id: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        title: {
            type: DataTypes.STRING,
            allowNull: true
        }
    }, {
        sequelize,
        modelName: 'ChatSession',
        timestamps: true
    });
    return ChatSession;
};