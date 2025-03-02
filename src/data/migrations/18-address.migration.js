'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('addresses', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            userId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: "users",
                    key: "id"
                },
                onUpdate: "CASCADE",
                onDelete: "CASCADE"
            },
            city_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: "cities", key: 'id'
                },
                onUpdate: "CASCADE",
                onDelete: "SET NULL"
            },
            district_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: "districts", key: "id"
                },
                onUpdate: "CASCADE",
                onDelete: "SET NULL"
            },
            ward_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: "wards", key: "id"
                },
                onUpdate: "CASCADE",
                onDelete: "SET NULL"
            },
            address_detail: {
                type: Sequelize.STRING,
                allowNull: false
            },
            is_default: {
                type: Sequelize.BOOLEAN,
                defaultValue: false
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
        await queryInterface.dropTable('addresses');
    }
};