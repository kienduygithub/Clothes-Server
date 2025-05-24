'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class ChatHistory extends Model {
        static associate(models) {
            ChatHistory.belongsTo(models.ChatSession, {
                foreignKey: 'session_id',
                targetKey: 'session_id'
            });
        }
    }
    ChatHistory.init({
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        messages: {
            type: DataTypes.TEXT('long'),
            allowNull: false,
            defaultValue: '[]',
            get() {
                const rawValue = this.getDataValue('messages');
                return rawValue ? JSON.parse(rawValue) : [];
            },

            set(value) {
                this.setDataValue('messages', JSON.stringify(value))
            }
        },
        session_id: {
            type: DataTypes.STRING,
            allowNull: false,
            references: {
                model: 'chatsessions',
                key: 'session_id'
            }
        },
    }, {
        sequelize,
        modelName: 'ChatHistory',
        timestamps: true
    });
    return ChatHistory;
};