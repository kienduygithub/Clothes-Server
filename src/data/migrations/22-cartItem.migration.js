'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('cartItems', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            cart_id: {
                type: Sequelize.INTEGER,
                references: {
                    model: 'carts',
                    key: 'id'
                },
                allowNull: false,
                onDelete: 'CASCADE'
            },
            product_variant_id: {
                type: Sequelize.INTEGER,
                references: {
                    model: 'productvariants',
                    key: 'id'
                },
                allowNull: false,
                onDelete: 'CASCADE'
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
        await queryInterface.dropTable('cartItems');
    }
};