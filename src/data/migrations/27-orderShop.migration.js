'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('orderShops', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            order_id: {
                type: Sequelize.INTEGER,
                references: {
                    model: 'orders',
                    key: 'id'
                },
                allowNull: false,
                onDelete: 'CASCADE'
            },
            shop_id: {
                type: Sequelize.INTEGER,
                references: {
                    model: 'shops',
                    key: 'id'
                },
                allowNull: false,
                onDelete: 'CASCADE'
            },
            coupon_id: {
                type: Sequelize.INTEGER,
                references: {
                    model: 'coupons',
                    key: 'id'
                },
                allowNull: true, // Có thể không dùng coupon
                onDelete: 'SET NULL'
            },
            status: {
                type: Sequelize.ENUM(
                    'pending',
                    'paid',
                    'shipped',
                    'completed',
                    'canceled',
                    'processing'
                ),
                allowNull: false
            },
            subtotal: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: false
            },
            discount: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: false
            },
            final_total: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: false
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE
            }
        });
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('orderShops');
    }
};