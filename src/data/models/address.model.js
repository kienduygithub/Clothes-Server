'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Address extends Model {
        static associate(models) {
            Address.belongsTo(models.User, {
                foreignKey: 'userId',
                onUpdate: "CASCADE",
                onDelete: "CASCADE"
            });

            Address.belongsTo(models.City, {
                foreignKey: "city_id",
                onUpdate: "CASCADE",
                onDelete: "SET NULL"
            });

            Address.belongsTo(models.District, {
                foreignKey: "district_id",
                onUpdate: "CASCADE",
                onDelete: "SET NULL",
            });

            Address.belongsTo(models.Ward, {
                foreignKey: "ward_id",
                onUpdate: "CASCADE",
                onDelete: "SET NULL",
            });

            // Address.hasMany(models.Order, {
            //     foreignKey: 'address_id',
            //     onUpdate: "CASCADE",
            //     onDelete: "SET NULL",
            // });
        }
    }

    Address.init({
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE"
        },
        city_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'cities',
                key: 'id'
            },
            onUpdate: "CASCADE",
        },
        district_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'districts',
                key: 'id'
            },
            onUpdate: "CASCADE",
        },
        ward_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'wards',
                key: 'id'
            },
            onUpdate: "CASCADE",
        },
        address_detail: DataTypes.STRING,
        is_default: DataTypes.BOOLEAN
    }, {
        sequelize,
        modelName: 'Address',
    });
    return Address;
};