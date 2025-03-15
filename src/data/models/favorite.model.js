'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Favorite extends Model {
        static associate(models) {
            Favorite.belongsTo(models.User, {
                foreignKey: 'user_id',
                as: 'user',
                onDelete: 'CASCADE'
            });
            Favorite.belongsTo(models.Product, {
                foreignKey: 'product_id',
                as: 'product',
                onDelete: 'CASCADE'
            });
        }
    }
    Favorite.init({
        user_id: {
            type: DataTypes.INTEGER,
            references: {
                model: 'users',
                key: 'id'
            },
            allowNull: false,
            onDelete: 'CASCADE'
        },
        product_id: {
            type: DataTypes.INTEGER,
            references: {
                model: 'products',
                key: 'id'
            },
            allowNull: false,
            onDelete: 'CASCADE'
        },
    }, {
        sequelize,
        modelName: 'Favorite',
    });
    return Favorite;
};