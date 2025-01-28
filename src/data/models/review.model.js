'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Review extends Model {
        static associate(models) {
            Review.belongsTo(models.User, {
                foreignKey: 'userId',
                as: 'user_review',
            });
            Review.belongsTo(models.Product, {
                foreignKey: 'productId',
                as: 'product_review'
            });
        }
    }
    Review.init({
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        productId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        rating: DataTypes.INTEGER,
        comment: DataTypes.STRING,
    }, {
        sequelize,
        modelName: 'Review',
    });
    return Review;
};