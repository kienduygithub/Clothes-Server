'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const categories = await queryInterface.sequelize.query(
            `SELECT id, category_name FROM categories WHERE category_name IN ('Áo', 'Quần', 'Váy', 'Đồ thể thao', 'Đồ ngủ', 'Đồ lót');`
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

            // Danh mục con cho Váy
            { category_name: 'Váy liền', parentId: findParentId('Váy'), createdAt: new Date(), updatedAt: new Date() },
            { category_name: 'Chân váy', parentId: findParentId('Váy'), createdAt: new Date(), updatedAt: new Date() },

            // Danh mục con cho Đồ thể thao
            { category_name: 'Áo thể thao', parentId: findParentId('Đồ thể thao'), createdAt: new Date(), updatedAt: new Date() },
            { category_name: 'Quần thể thao', parentId: findParentId('Đồ thể thao'), createdAt: new Date(), updatedAt: new Date() },
            { category_name: 'Bộ thể thao', parentId: findParentId('Đồ thể thao'), createdAt: new Date(), updatedAt: new Date() },

            // Danh mục con cho Đồ ngủ
            { category_name: 'Bộ đồ ngủ', parentId: findParentId('Đồ ngủ'), createdAt: new Date(), updatedAt: new Date() },
            { category_name: 'Áo choàng ngủ', parentId: findParentId('Đồ ngủ'), createdAt: new Date(), updatedAt: new Date() },

            // Danh mục con cho Đồ lót
            { category_name: 'Áo lót', parentId: findParentId('Đồ lót'), createdAt: new Date(), updatedAt: new Date() },
            { category_name: 'Quần lót', parentId: findParentId('Đồ lót'), createdAt: new Date(), updatedAt: new Date() },

            // Danh mục con cho phụ kiện
            { category_name: 'Mũ', parentId: findParentId('Phụ kiện'), createdAt: new Date(), updatedAt: new Date() },
            { category_name: 'Túi xách', parentId: findParentId('Phụ kiện'), createdAt: new Date(), updatedAt: new Date() },
            { category_name: 'Khăn quàng', parentId: findParentId('Phụ kiện'), createdAt: new Date(), updatedAt: new Date() },
        ]);
    },

    async down(queryInterface, Sequelize) {
        return queryInterface.bulkDelete('categories', null, {});
    }
};
