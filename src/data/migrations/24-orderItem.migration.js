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
            order_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'orders',
                    key: 'id'
                },
                onDelete: "CASCADE"
            },
            product_variant_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'productvariants',
                    key: 'id'
                },
                onDelete: "CASCADE"
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