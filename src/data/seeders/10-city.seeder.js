'use strict';
const axios = require('axios');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        try {
            const response = await axios.get('https://provinces.open-api.vn/api/p');
            const cities = response.data.map(city => ({
                id: city.code,
                name: city.name,
            }));
            await queryInterface.bulkInsert('cities', cities);
        } catch (error) {
            console.error('Lỗi khi lấy dữ liệu cities:', error);
        }
    },

    async down(queryInterface, Sequelize) {
        return queryInterface.bulkDelete('cities', null, {});
    }
};
