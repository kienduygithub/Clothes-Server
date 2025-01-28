'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        return queryInterface.bulkInsert('categories', [
            {
                category_name: 'Áo',
                description: 'Danh mục các loại áo.',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                category_name: 'Quần',
                description: 'Danh mục các loại quần.',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                category_name: 'Váy',
                description: 'Danh mục các loại váy.',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                category_name: 'Đồ thể thao',
                description: 'Danh mục các loại đồ thể thao.',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                category_name: 'Đồ ngủ',
                description: 'Danh mục các loại đồ ngủ.',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                category_name: 'Đồ lót',
                description: 'Danh mục các loại đồ lót.',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                category_name: 'Phụ kiện',
                description: 'Danh mục các loại phụ kiện.',
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ]);
    },

    async down(queryInterface, Sequelize) {
        return queryInterface.bulkDelete('categories', null, {});
    }
};
