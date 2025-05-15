'use strict';


/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('orders', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            user_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id'
                },
                onDelete: 'CASCADE'
            },
            address_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'addresses',
                    key: 'id'
                },
                onDelete: 'SET NULL',
            },
            total_price: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: false
            },
            status: {
                type: Sequelize.ENUM(
                    'pending',
                    'paid',
                    'shipped',
                    'completed',
                    'canceled',
                    'processing'
                ),
                allowNull: false
            },
            status_changed_at: {
                type: Sequelize.DATE,
                allowNull: true
            },
            payment_date: {
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
        await queryInterface.dropTable('orders');
    }
};