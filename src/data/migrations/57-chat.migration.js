'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('chats', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            // Người gửi tin nhắn (có thể là user hoặc shop)
            senderId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id'
                },
                onDelete: 'CASCADE'
            },
            // Người nhận tin nhắn (có thể là user hoặc shop)
            receiverId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id'
                },
                onDelete: 'CASCADE'
            },
            // Nội dung tin nhắn
            message: {
                type: Sequelize.TEXT,
                allowNull: false
            },
            messageType: {
                type: Sequelize.ENUM('text', 'image', 'file'),
                allowNull: false,
                defaultValue: 'text'
            },
            attachments: {
                type: Sequelize.JSON,
                allowNull: true,
                defaultValue: null,
                comment: 'Array of attachment objects containing url and type'
            },
            // Trạng thái đã đọc
            isRead: {
                type: Sequelize.BOOLEAN,
                defaultValue: false
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

        // Tạo index để tối ưu tìm kiếm tin nhắn giữa 2 người
        await queryInterface.addIndex('chats', ['senderId', 'receiverId'], {
            name: 'chats_sender_receiver_idx'
        });
    },

    async down(queryInterface, Sequelize) {
        // Xóa index trước khi xóa bảng
        await queryInterface.removeIndex('chats', 'chats_sender_receiver_idx');
        await queryInterface.dropTable('chats');
    }
}; 