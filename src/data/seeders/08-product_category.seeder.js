'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        return queryInterface.bulkInsert('product_categories', [
            // Sản phẩm 1: Áo sơ mi nam -> Danh mục: Áo sơ mi, Quần áo nam
            { productId: 1, categoryId: 8, createdAt: new Date(), updatedAt: new Date() }, // Áo sơ mi
            { productId: 1, categoryId: 9, createdAt: new Date(), updatedAt: new Date() }, // Quần áo nam

            // Sản phẩm 2: Quần tây nam -> Danh mục: Quần tây, Quần áo nam
            { productId: 2, categoryId: 10, createdAt: new Date(), updatedAt: new Date() }, // Quần tây
            { productId: 2, categoryId: 11, createdAt: new Date(), updatedAt: new Date() }, // Quần áo nam

            // Sản phẩm 3: Giày thể thao nữ -> Danh mục: Giày thể thao, Quần áo nữ
            { productId: 3, categoryId: 12, createdAt: new Date(), updatedAt: new Date() }, // Giày thể thao
            { productId: 3, categoryId: 13, createdAt: new Date(), updatedAt: new Date() }, // Quần áo nữ
        ]);
    },

    async down(queryInterface, Sequelize) {
        return queryInterface.bulkDelete('product_categories', null, {});
    }
};
