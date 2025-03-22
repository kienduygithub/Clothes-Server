'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('coupons', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            shop_id: {
                type: Sequelize.INTEGER,
                references: {
                    model: 'shops',
                    key: 'id'
                },
                allowNull: false,
                onDelete: "CASCADE"
            },
            name: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            code: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true
            },
            discount_type: {
                type: Sequelize.ENUM('percentage', 'fixed'),
                allowNull: false
            },
            discount_value: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: false,
                defaultValue: 0
            },
            max_discount: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: false,
                defaultValue: 0
            },
            min_order_value: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: false,
                defaultValue: 0
            },
            times_used: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0
            },
            max_usage: {
                type: Sequelize.INTEGER,
                allowNull: true // Null nếu không giới hạn số lần sử dụng
            },
            valid_from: {
                type: Sequelize.DATE,
                allowNull: true
            },
            valid_to: {
                type: Sequelize.DATE,
                allowNull: true
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
        await queryInterface.dropTable('coupons');
    }
};