'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class User extends Model {
        static associate(models) {
            // Cửa hàng
            User.belongsTo(models.Shop, {
                foreignKey: 'shopId',
                as: 'shop',
                onDelete: 'CASCADE'
            });
            // Review
            User.belongsToMany(models.Product, {
                through: models.Review,
                foreignKey: 'user_id',
                otherKey: 'product_id'
            });
            // Favorite
            User.belongsToMany(models.Product, {
                through: models.Favorite,
                foreignKey: 'user_id',
                otherKey: 'product_id'
            })
            // Địa chỉ Address
            User.hasMany(models.Address, {
                foreignKey: 'userId',
                as: 'addresses',
                onDelete: "CASCADE"
            });
            // Đơn hàng
            User.hasMany(models.Order, {
                foreignKey: 'user_id',
                as: 'orders',
                onDelete: "CASCADE"
            });
            // Giỏ hàng
            User.hasMany(models.Cart, {
                foreignKey: 'user_id',
                as: 'carts',
                onDelete: 'CASCADE'
            });
            // User 1 - N UserCoupon: Một người dùng có thể lưu nhiều mã -> User N - N Coupon
            User.belongsToMany(models.Coupon, {
                through: models.Coupon,
                foreignKey: 'user_id',
                otherKey: 'coupon_id'
            });
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
            references: {
                model: 'shops',
                key: 'id'
            },
            allowNull: true,
            onDelete: 'CASCADE'
        },
        roles: DataTypes.ENUM('Admin', 'Owner', 'Customer'),
    }, {
        sequelize,
        modelName: 'User',
    });
    return User;
};