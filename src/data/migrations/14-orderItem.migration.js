'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('orderItems', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            orderId: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            productId: {
                type: Sequelize.INTEGER,
                allowNull: false
            },
            colorId: {
                type: Sequelize.INTEGER,
                allowNull: false
            },
            sizeId: {
                type: Sequelize.INTEGER,
                allowNull: false
            },
            unit_price: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: false
            },
            order_quantity: {
                type: Sequelize.INTEGER,
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
        await queryInterface.dropTable('orderItems');
    }
};