'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('cartShops', {
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
            shop_id: {
                type: Sequelize.INTEGER,
                references: {
                    model: 'shops',
                    key: 'id'
                },
                allowNull: false,
                onDelete: 'CASCADE'
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
        await queryInterface.dropTable('cartShops');
    }
};