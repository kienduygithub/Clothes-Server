'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('conversations', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            userId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id'
                },
                onDelete: 'CASCADE'
            },
            otherUserId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id'
                },
                onDelete: 'CASCADE'
            },
            lastMessageId: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'chats',
                    key: 'id'
                },
                onDelete: 'SET NULL'
            },
            unreadCount: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE
            }
        });

        // Tạo unique index để đảm bảo mỗi cặp (userId, otherUserId) là duy nhất
        await queryInterface.addIndex('conversations', ['userId', 'otherUserId'], {
            name: 'conversations_user_otheruser_unique',
            unique: true
        });

        // Tạo index để tối ưu tìm kiếm cuộc trò chuyện theo userId
        await queryInterface.addIndex('conversations', ['userId'], {
            name: 'conversations_user_idx'
        });
    },

    async down(queryInterface, Sequelize) {
        // Xóa các index trước khi xóa bảng
        await queryInterface.removeIndex('conversations', 'conversations_user_otheruser_unique');
        await queryInterface.removeIndex('conversations', 'conversations_user_idx');
        await queryInterface.dropTable('conversations');
    }
}; 