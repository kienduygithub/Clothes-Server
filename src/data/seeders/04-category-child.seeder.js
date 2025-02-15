'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const categories = await queryInterface.sequelize.query(
            `SELECT id, category_name FROM categories WHERE category_name IN ('Áo', 'Quần', 'Giày', 'Váy/Đầm', 'Phụ kiện');`
        );

        const parentCategories = categories[0];

        const findParentId = (name) =>
            parentCategories.find((category) => category.category_name === name)?.id;

        return queryInterface.bulkInsert('categories', [
            // Danh mục con cho Áo
            { category_name: 'Áo sơ mi', parentId: findParentId('Áo'), createdAt: new Date(), updatedAt: new Date() },
            { category_name: 'Áo thun', parentId: findParentId('Áo'), createdAt: new Date(), updatedAt: new Date() },
            { category_name: 'Áo khoác', parentId: findParentId('Áo'), createdAt: new Date(), updatedAt: new Date() },

            // Danh mục con cho Quần
            { category_name: 'Quần tây', parentId: findParentId('Quần'), createdAt: new Date(), updatedAt: new Date() },
            { category_name: 'Quần jeans', parentId: findParentId('Quần'), createdAt: new Date(), updatedAt: new Date() },
            { category_name: 'Quần short', parentId: findParentId('Quần'), createdAt: new Date(), updatedAt: new Date() },

            // Danh mục con cho Giày
            { category_name: 'Sneaker', parentId: findParentId('Giày'), createdAt: new Date(), updatedAt: new Date() },
            { category_name: 'Giày cao gót', parentId: findParentId('Giày'), createdAt: new Date(), updatedAt: new Date() },
            { category_name: 'Dép, Sandal', parentId: findParentId('Giày'), createdAt: new Date(), updatedAt: new Date() },

            // Danh mục con cho Váy/Đầm
            { category_name: 'Đầm công sở', parentId: findParentId('Váy/Đầm'), createdAt: new Date(), updatedAt: new Date() },
            { category_name: 'Đầm dạ hội', parentId: findParentId('Váy/Đầm'), createdAt: new Date(), updatedAt: new Date() },
            { category_name: 'Chân váy', parentId: findParentId('Váy/Đầm'), createdAt: new Date(), updatedAt: new Date() },

            // Danh mục con cho Phụ kiện
            { category_name: 'Mũ', parentId: findParentId('Phụ kiện'), createdAt: new Date(), updatedAt: new Date() },
            { category_name: 'Túi xách', parentId: findParentId('Phụ kiện'), createdAt: new Date(), updatedAt: new Date() },
            { category_name: 'Thắt lưng', parentId: findParentId('Phụ kiện'), createdAt: new Date(), updatedAt: new Date() },
        ]);
    },

    async down(queryInterface, Sequelize) {
        return queryInterface.bulkDelete('categories', null, {});
    }
};
