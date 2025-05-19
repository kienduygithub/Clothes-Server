'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('products', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            shopId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'shops',
                    key: 'id'
                },
                onDelete: 'CASCADE'
            },
            categoryId: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'categories',
                    key: 'id'
                },
                onDelete: 'SET NULL'
            },
            product_name: {
                type: Sequelize.STRING,
                allowNull: false
            },
            origin: {
                type: Sequelize.STRING,
                allowNull: true
            },
            gender: {
                type: Sequelize.ENUM('Male', 'Female', 'Unisex', 'Kids', 'Other'),
                allowNull: false
            },
            description: {
                type: Sequelize.TEXT('medium'),
                allowNull: true
            },
            sold_quantity: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0
            },
            unit_price: {
                type: Sequelize.DECIMAL(10, 2),
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
        await queryInterface.dropTable('products');
    }
};