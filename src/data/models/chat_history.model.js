'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class ChatHistory extends Model {
        static associate(models) {

        }
    }
    ChatHistory.init({
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
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
        }
    }, {
        sequelize,
        modelName: 'ChatHistory',
        timestamps: true
    });
    return ChatHistory;
};