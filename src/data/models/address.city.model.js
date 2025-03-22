'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class City extends Model {
        static associate(models) {
            City.hasMany(models.District, {
                foreignKey: "city_id",
                as: 'districts',
                onUpdate: "CASCADE",
                onDelete: "RESTRICT",
            });

            City.hasMany(models.Address, {
                foreignKey: "city_id",
                onUpdate: "CASCADE",
                onDelete: "SET NULL",
            });
        }
    }
    City.init({
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
    }, {
        sequelize,
        modelName: 'City',
        timestamps: false // Không createdAt, updatedAt
    });
    return City;
};