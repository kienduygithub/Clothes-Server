'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('shops', 'balance', {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.00,
        });

        await queryInterface.addColumn('shops', 'failed_attempts', {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
        });

        await queryInterface.addColumn('shops', 'lock_until', {
            type: Sequelize.DATE,
            allowNull: true,
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('shops', 'balance');
        await queryInterface.removeColumn('shops', 'failed_attempts');
        await queryInterface.removeColumn('shops', 'lock_until');
    },
};