'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        return queryInterface.bulkInsert('sizes', [
            {
                size_code: 'S',
                order_sequence: 1,
            },
            {
                size_code: 'M',
                order_sequence: 2,
            },
            {
                size_code: 'L',
                order_sequence: 3,
            },
            {
                size_code: 'XL',
                order_sequence: 4,
            },
            {
                size_code: 'XXL',
                order_sequence: 5,
            },
        ]);
    },

    async down(queryInterface, Sequelize) {
        return queryInterface.bulkDelete('sizes', null, {});
    }
};
