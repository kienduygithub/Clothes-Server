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
            userId: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            shipping_fee: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: true
            },
            payable_price: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: false
            },
            total_price: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: false
            },
            status: {
                type: Sequelize.ENUM('pending', 'paid', 'canceled'),
                allowNull: false
            },
            status_changed_at: {
                type: Sequelize.DATE,
                allowNull: true
            },
            payment_date: {
                type: Sequelize.DATE,
                allowNull: false
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