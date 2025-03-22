'use strict';
const axios = require('axios');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        try {
            const response = await axios.get('https://provinces.open-api.vn/api/d');
            const districts = response.data.map(district => ({
                id: district.code,
                name: district.name,
                city_id: district.province_code,
            }));

            await queryInterface.bulkInsert('districts', districts);
        } catch (error) {
            console.error('Lỗi khi lấy dữ liệu districts:', error);
        }
    },

    async down(queryInterface, Sequelize) {
        return queryInterface.bulkDelete('districts', null, {});
    }
};
