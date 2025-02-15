'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        return queryInterface.bulkInsert('categories', [
            { category_name: 'Áo', parentId: null, image_url: 'categories/clothes_men.png', createdAt: new Date(), updatedAt: new Date() },
            { category_name: 'Quần', parentId: null, image_url: 'categories/clothes_kids.png', createdAt: new Date(), updatedAt: new Date() },
            { category_name: 'Giày', parentId: null, image_url: 'categories/shoes_men.png', createdAt: new Date(), updatedAt: new Date() },
            { category_name: 'Váy/Đầm', parentId: null, image_url: 'categories/clothes_women.png', createdAt: new Date(), updatedAt: new Date() },
            { category_name: 'Phụ kiện', parentId: null, image_url: 'categories/accessories.png', createdAt: new Date(), updatedAt: new Date() }
        ]);
    },

    async down(queryInterface, Sequelize) {
        return queryInterface.bulkDelete('categories', null, {});
    }
};
