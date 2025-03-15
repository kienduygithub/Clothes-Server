'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Cart extends Model {
        static associate(models) {
            Cart.belongsTo(models.User, {
                foreignKey: 'user_id',
                as: 'user',
                onDelete: 'CASCADE'
            });
            Cart.hasMany(models.CartItem, {
                foreignKey: 'cart_id',
                as: 'cart_items',
                onDelete: 'CASCADE'
            })
        }
    }
    Cart.init({
        user_id: {
            type: DataTypes.INTEGER,
            references: {
                model: 'users',
                key: 'id'
            },
            allowNull: false,
            onDelete: 'CASCADE'
        },
        status: DataTypes.ENUM('active', 'checked_out', 'removed'),
    }, {
        sequelize,
        modelName: 'Cart',
    });
    return Cart;
};