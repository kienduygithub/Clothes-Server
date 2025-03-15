'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class User extends Model {
        static associate(models) {
            User.belongsTo(models.Shop, {
                foreignKey: 'shopId',
                as: 'shop',
                onDelete: 'CASCADE'
            });
            User.hasMany(models.Review, {
                foreignKey: 'userId',
                as: 'reviews',
                onDelete: 'CASCADE'
            });
            User.hasMany(models.Address, {
                foreignKey: 'userId',
                onUpdate: "CASCADE",
                onDelete: "CASCADE"
            });
            User.hasMany(models.Order, {
                foreignKey: 'userId',
                onUpdate: "CASCADE",
                onDelete: "CASCADE"
            });
            User.hasMany(models.Cart, {
                foreignKey: 'user_id',
                as: 'carts',
                onDelete: 'CASCADE'
            })
        }
    }
    User.init({
        name: DataTypes.STRING,
        email: DataTypes.STRING,
        password: DataTypes.STRING,
        phone: DataTypes.STRING,
        gender: DataTypes.TINYINT,
        address: DataTypes.STRING,
        image_url: DataTypes.STRING,
        shopId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        roles: DataTypes.ENUM('Admin', 'Owner', 'Customer'),
    }, {
        sequelize,
        modelName: 'User',
    });
    return User;
};