'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Favorite extends Model {
        static associate(models) {

        }
    }
    Favorite.init({
        userId: DataTypes.INTEGER,
        productId: DataTypes.INTEGER,
    }, {
        sequelize,
        modelName: 'Favorite',
    });
    return Favorite;
};