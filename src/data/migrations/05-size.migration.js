'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('sizes', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            size_code: {
                type: Sequelize.ENUM('S', 'M', 'L', 'XL', 'XXL'),
                allowNull: false
            },
            order_sequence: {
                type: Sequelize.TINYINT,
                allowNull: false
            },
        });
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('sizes');
    }
};