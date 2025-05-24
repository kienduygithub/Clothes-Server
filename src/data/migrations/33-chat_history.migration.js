'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('chathistories', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            user_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'users',
                    key: 'id'
                },
                onDelete: "CASCADE"
            },
            messages: {
                type: Sequelize.TEXT('long'),
                allowNull: false,
                defaultValue: '[]',
            },
            session_id: {
                type: Sequelize.STRING,
                allowNull: false,
                references: {
                    model: 'chatsessions',
                    key: 'session_id'
                }
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
        await queryInterface.dropTable('chathistories');
    }
};