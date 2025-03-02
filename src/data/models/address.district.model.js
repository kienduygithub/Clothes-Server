'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class District extends Model {
        static associate(models) {
            District.belongsTo(models.City, {
                foreignKey: "city_id",
                onUpdate: "CASCADE",
                onDelete: "CASCADE"
            });

            District.hasMany(models.Ward, {
                foreignKey: "district_id",
                onUpdate: "CASCADE",
                onDelete: "CASCADE"
            });

            District.hasMany(models.Address, {
                foreignKey: "district_id",
                onUpdate: "CASCADE",
                onDelete: "SET NULL"
            });
        }
    }
    District.init({
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        city_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "cities", key: "id" },
            onDelete: "CASCADE",
        },
    }, {
        sequelize,
        modelName: 'District',
    });
    return District;
};