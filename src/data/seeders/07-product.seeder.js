'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.bulkInsert('products', [
            {
                shopId: 1,
                product_name: 'Áo sơ mi nam',
                gender: 'Male',
                origin: 'Việt Nam',
                description: 'Áo sơ mi nam cao cấp, chất liệu thoáng mát.',
                sold_quantity: 10,
                unit_price: 350000,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                shopId: 2,
                product_name: 'Quần tây nam',
                gender: 'Male',
                origin: 'Việt Nam',
                description: 'Quần tây nam lịch lãm, phù hợp đi làm và dự tiệc.',
                sold_quantity: 5,
                unit_price: 450000,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                shopId: 1,
                product_name: 'Áo thun nam',
                gender: 'Male',
                origin: 'Việt Nam',
                description: 'Áo thun nam thoải mái, phù hợp mặc hàng ngày.',
                sold_quantity: 20,
                unit_price: 250000,
                createdAt: new Date(),
                updatedAt: new Date(),
            }
        ]);

        await queryInterface.bulkInsert('productimages', [
            {
                productId: 1,
                image_url: '/products/product_example_1.png',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                productId: 2,
                image_url: '/products/product_example_1.png',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                productId: 2,
                image_url: '/products/product_example_2.png',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                productId: 2,
                image_url: '/products/product_example_3.png',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                productId: 3,
                image_url: '/products/product_example_1.png',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                productId: 3,
                image_url: '/products/product_example_3.png',
                createdAt: new Date(),
                updatedAt: new Date()
            },
        ])
    },

    async down(queryInterface, Sequelize) {
        return queryInterface.bulkDelete('products', null, {});
    }
};