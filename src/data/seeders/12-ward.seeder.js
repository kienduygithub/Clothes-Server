'use strict';
const axios = require('axios');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        try {
            const response = await axios.get('https://provinces.open-api.vn/api/w');
            const wards = response.data.map(ward => ({
                id: ward.code,
                name: ward.name,
                district_id: ward.district_code,
            }));

            await queryInterface.bulkInsert('wards', wards);
        } catch (error) {
            console.error('Lỗi khi lấy dữ liệu wards:', error);
        }
    },

    async down(queryInterface, Sequelize) {
        return queryInterface.bulkDelete('wards', null, {});
    }
};
