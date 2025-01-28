'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Cart extends Model {
        static associate(models) {

        }
    }
    Cart.init({
        userId: DataTypes.INTEGER,
        status: DataTypes.ENUM('active', 'checked_out', 'removed'),
    }, {
        sequelize,
        modelName: 'Cart',
    });
    return Cart;
};