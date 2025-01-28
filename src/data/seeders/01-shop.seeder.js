'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        return queryInterface.bulkInsert('shops', [
            {
                shop_name: 'Shop A',
                logo_url: 'shop_example_1.png',
                description: 'Cửa hàng thời trang cao cấp.',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                shop_name: 'Shop B',
                logo_url: 'shop_example_2.png',
                description: 'Cửa hàng bán đồ thể thao chất lượng.',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                shop_name: 'Shop C',
                logo_url: 'shop_example_3.png',
                description: 'Cửa hàng chuyên bán phụ kiện thời trang.',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ]);
    },

    async down(queryInterface, Sequelize) {
        return queryInterface.bulkDelete('shops', null, {});
    }
};
