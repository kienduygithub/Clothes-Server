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

            balance: {
                type: Sequelize.DECIMAL(10, 2),
                defaultValue: 0
            },
            failed_attempts: {
                type: Sequelize.INTEGER,
                defaultValue: 0
            },
            lock_until: {
                type: Sequelize.DATE,
                allowNull: true
            },
            statusChangedAt: {
                type: Sequelize.DATE,
                allowNull: true
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