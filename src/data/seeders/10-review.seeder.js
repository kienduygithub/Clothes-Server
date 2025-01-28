'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        return queryInterface.bulkInsert('reviews', [
            {
                userId: 1, // ID người dùng
                productId: 1, // ID sản phẩm
                rating: 5, // Đánh giá 5 sao
                comment: 'Sản phẩm tuyệt vời, chất lượng tốt!',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                userId: 2,
                productId: 1,
                rating: 4,
                comment: 'Áo đẹp nhưng hơi chật một chút.',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                userId: 3,
                productId: 2,
                rating: 3,
                comment: 'Quần ổn, nhưng không phù hợp với tôi.',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                userId: 4,
                productId: 3,
                rating: 4,
                comment: 'Áo thun rất thoải mái, màu sắc đẹp.',
                createdAt: new Date(),
                updatedAt: new Date(),
            }
        ]);
    },

    async down(queryInterface, Sequelize) {
        return queryInterface.bulkDelete('reviews', null, {});
    }
};
