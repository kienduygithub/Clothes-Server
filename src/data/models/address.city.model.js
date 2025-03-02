'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class City extends Model {
        static associate(models) {
            City.hasMany(models.District, {
                foreignKey: "city_id",
                onDelete: "RESTRICT",
                onUpdate: "CASCADE",
            });

            City.hasMany(models.Address, {
                foreignKey: "city_id",
                onDelete: "SET NULL",
                onUpdate: "CASCADE",
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
    });
    return City;
};