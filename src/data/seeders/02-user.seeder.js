'use strict';

const bcrypt = require('bcryptjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync('123456', salt);
        return queryInterface.bulkInsert('users', [
            {
                name: 'Admin',
                email: 'admin@example.com',
                password: '123456',
                phone: '1234567890',
                gender: 1,
                address: 'Shoper',
                image_url: null,
                roles: 'Admin',
                shopId: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                name: 'Owner 1',
                email: 'owner1@example.com',
                password: '123456',
                phone: '2345678901',
                gender: 1,
                address: 'HB - TL',
                image_url: null,
                roles: 'Owner',
                shopId: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                name: 'Owner 2',
                email: 'owner2@example.com',
                password: '123456',
                phone: '3456789012',
                gender: 0,
                address: 'TL - HB',
                image_url: null,
                roles: 'Owner',
                shopId: 2,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                name: 'Owner 3',
                email: 'owner3@example.com',
                password: '123456',
                phone: '3456789012',
                gender: 0,
                address: 'TL - HB',
                image_url: null,
                roles: 'Owner',
                shopId: 3,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                name: 'Customer 1',
                email: 'customer1@example.com',
                password: '123456',
                phone: '4567890123',
                gender: 1,
                address: 'HN - HB',
                image_url: null,
                roles: 'Customer',
                shopId: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                name: 'Customer 2',
                email: 'customer2@example.com',
                password: '123456',
                phone: '5678901234',
                gender: 0,
                address: 'HB - HN',
                image_url: null,
                roles: 'Customer',
                shopId: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                name: 'Customer 3',
                email: 'customer3@example.com',
                password: '123456',
                phone: '5678901234',
                gender: 0,
                address: 'HB - HN',
                image_url: null,
                roles: 'Customer',
                shopId: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                name: 'Customer 4',
                email: 'customer4@example.com',
                password: '123456',
                phone: '5678901234',
                gender: 0,
                address: 'HB - HN',
                image_url: null,
                roles: 'Customer',
                shopId: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ]);
    },

    async down(queryInterface, Sequelize) {
        return queryInterface.bulkDelete('users', null, {});
    }
};
