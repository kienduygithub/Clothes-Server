'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const now = new Date();

        const generateVariants = (productId, colors, sizes) => {
            const variants = [];
            colors.forEach((colorId) => {
                sizes.forEach((sizeId) => {
                    variants.push({
                        productId,
                        colorId,
                        sizeId,
                        sku: `SKU${productId}-${colorId}-${sizeId}`,
                        stock_quantity: Math.floor(Math.random() * 100) + 1, // Random stock quantity
                        createdAt: now,
                        updatedAt: now,
                    });
                });
            });
            return variants;
        };

        const productVariants = [
            // Product 1: Áo sơ mi nam
            ...generateVariants(1, [1, 2], [1, 2, 3]), // Trắng, Xanh; Size S, M, L

            // Product 2: Quần tây nam
            ...generateVariants(2, [3, 4], [1, 2, 3]), // Đen, Xám; Size S, M, L

            // Product 3: Áo thun nữ
            ...generateVariants(3, [5, 6], [1, 2]), // Hồng, Trắng; Size S, M
        ];

        return queryInterface.bulkInsert('productvariants', productVariants);
    },

    async down(queryInterface, Sequelize) {
        return queryInterface.bulkDelete('productvariants', null, {});
    }
};
