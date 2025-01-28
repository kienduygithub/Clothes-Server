'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('productVariants', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            productId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'products',
                    key: 'id'
                },
                onDelete: 'CASCADE'
            },
            colorId: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'colors',
                    key: 'id'
                },
                onDelete: 'SET NULL'
            },
            sizeId: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'sizes',
                    key: 'id'
                },
                onDelete: 'SET NULL'
            },
            image_url: {
                type: Sequelize.STRING,
                allowNull: true
            },
            sku: {
                type: Sequelize.STRING,
                allowNull: true
            },
            stock_quantity: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0
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
        await queryInterface.dropTable('productVariants');
    }
};