'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('shops', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            shop_name: {
                type: Sequelize.STRING,
                allowNull: false
            },
            logo_url: {
                type: Sequelize.STRING,
                allowNull: false
            },
            background_url: {
                type: Sequelize.STRING,
                allowNull: false
            },
            contact_email: {
                type: Sequelize.STRING,
                allowNull: true
            },
            contact_address: {
                type: Sequelize.STRING,
                allowNull: true
            },
            description: {
                type: Sequelize.TEXT('medium'),
                allowNull: true,
            },
            status: {
                type: Sequelize.ENUM('active', 'inactive', 'pending')
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
        await queryInterface.dropTable('shops');
    }
};