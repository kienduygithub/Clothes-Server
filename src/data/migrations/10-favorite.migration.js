'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('favorites', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            user_id: {
                type: Sequelize.INTEGER,
                references: {
                    model: 'users',
                    key: 'id'
                },
                allowNull: false,
                onDelete: 'CASCADE'
            },
            product_id: {
                type: Sequelize.INTEGER,
                references: {
                    model: 'products',
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
        await queryInterface.dropTable('favorites');
    }
};