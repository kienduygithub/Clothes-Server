'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        return queryInterface.bulkInsert('colors', [
            {
                color_name: 'Đỏ',
                color_code: '#FF0000',
            },
            {
                color_name: 'Xanh lá',
                color_code: '#00FF00',
            },
            {
                color_name: 'Xanh dương',
                color_code: '#0000FF',
            },
            {
                color_name: 'Vàng',
                color_code: '#FFFF00',
            },
            {
                color_name: 'Xanh lơ',
                color_code: '#00FFFF',
            },
            {
                color_name: 'Hồng tím',
                color_code: '#FF00FF',
            },
            {
                color_name: 'Đen',
                color_code: '#000000',
            },
            {
                color_name: 'Trắng',
                color_code: '#FFFFFF',
            },
        ]);
    },

    async down(queryInterface, Sequelize) {
        return queryInterface.bulkDelete('colors', null, {});
    }
};
