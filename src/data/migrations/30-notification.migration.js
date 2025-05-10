'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('notifications', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            user_id: {
                type: Sequelize.INTEGER,
                references: {
                    model: 'users',
                    key: 'id'
                },
                allowNull: false,
                onDelete: "CASCADE"
            },
            roles: {
                type: Sequelize.ENUM('Admin', 'Owner', 'Customer'),
                allowNull: false,
                defaultValue: "Admin"
            },
            type: {
                type: Sequelize.ENUM(
                    'ORDER_NEW',
                    'ORDER_CANCELED',
                    'STORE_REGISTRATION_REQUEST',
                    'STORE_REGISTRATION_REJECTED',
                    'PRODUCT_LOW_STOCK'
                ),
                allowNull: false,
            },
            reference_id: {
                type: Sequelize.INTEGER,
                allowNull: true
            },
            reference_type: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            data: {
                type: Sequelize.JSON, /** Lưu thêm thông tin bổ sung **/
                allowNull: true,
            },
            action: {
                type: Sequelize.STRING,
                allowNull: true
            },
            is_read: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
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
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('notifications');
    }
};