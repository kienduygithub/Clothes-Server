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
            Review.belongsTo(models.ProductVariant, {
                foreignKey: 'product_variant_id',
                as: 'product_variant',
                onDelete: 'SET NULL'
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
        product_variant_id: {
            type: DataTypes.INTEGER,
            references: {
                model: 'productvariants',
                key: 'id'
            },
            allowNull: true,
            onDelete: 'SET NULL'
        },
        rating: DataTypes.INTEGER,
        comment: DataTypes.STRING,
    }, {
        sequelize,
        modelName: 'Review',
    });
    return Review;
};