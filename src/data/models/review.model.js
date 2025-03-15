'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Review extends Model {
        static associate(models) {
            Review.belongsTo(models.User, {
                foreignKey: 'user_id',
                as: 'user_review',
                onDelete: 'CASCADE'
            });
            Review.belongsTo(models.Product, {
                foreignKey: 'product_id',
                as: 'product_review',
                onDelete: 'CASCADE'
            });
        }
    }
    Review.init({
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
        rating: DataTypes.INTEGER,
        comment: DataTypes.STRING,
    }, {
        sequelize,
        modelName: 'Review',
    });
    return Review;
};