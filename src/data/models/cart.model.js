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
            Cart.hasMany(models.CartShop, {
                foreignKey: 'cart_id',
                as: 'cart_shops',
                onDelete: 'CASCADE'
            });
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
    }, {
        sequelize,
        modelName: 'Cart',
    });
    return Cart;
};