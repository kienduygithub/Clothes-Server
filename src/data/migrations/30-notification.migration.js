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
                type: Sequelize.ENUM("Drawback", "Order", "Product"),
                allowNull: false,
                defaultValue: "Drawback"
            },
            title: {
                type: Sequelize.STRING,
                allowNull: false,
                defaultValue: ''
            },
            message: {
                type: Sequelize.STRING,
                allowNull: false,
                defaultValue: ''
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