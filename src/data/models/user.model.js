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
            User.hasMany(models.Review, {
                foreignKey: 'user_id',
                as: 'reviews'
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
            User.hasOne(models.Cart, {
                foreignKey: 'user_id',
                as: 'cart',
                onDelete: 'CASCADE'
            });
            // User 1 - N UserCoupon: Một người dùng có thể lưu nhiều mã -> User N - N Coupon
            User.belongsToMany(models.Coupon, {
                through: models.UserCoupon,
                as: 'user_coupons',
                foreignKey: 'user_id',
                otherKey: 'coupon_id'
            });
            /** User - Notification: 1 - N */
            User.hasMany(models.Notification, {
                foreignKey: 'user_id',
                as: 'notifications',
                onDelete: 'CASCADE'
            })
            User.hasMany(models.Favorite, {
                foreignKey: 'user_id',
                as: 'user_favorites',
                onDelete: 'CASCADE'
            })

            // Chat: Tin nhắn đã gửi
            User.hasMany(models.Chat, {
                foreignKey: 'senderId',
                as: 'sent_messages',
                onDelete: 'CASCADE',
            });

            // Chat: Tin nhắn đã nhận
            User.hasMany(models.Chat, {
                foreignKey: 'receiverId',
                as: 'received_messages',
                onDelete: 'CASCADE'
            });

            // Conversation: Các cuộc trò chuyện của người dùng
            User.hasMany(models.Conversation, {
                foreignKey: 'userId',
                as: 'conversations',
                onDelete: 'CASCADE'
            });

            // Conversation: Người dùng là "otherUser" trong cuộc trò chuyện
            User.hasMany(models.Conversation, {
                foreignKey: 'otherUserId',
                as: 'other_conversations',
                onDelete: 'CASCADE'
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