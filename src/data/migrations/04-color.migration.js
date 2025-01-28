'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('colors', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            color_name: {
                type: Sequelize.STRING,
                allowNull: false
            },
            color_code: {
                type: Sequelize.STRING,
                allowNull: false
            },
        });
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('colors');
    }
};