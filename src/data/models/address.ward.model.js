'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Ward extends Model {
        static associate(models) {
            // Mỗi Ward thuộc một District
            Ward.belongsTo(models.District, {
                foreignKey: "district_id",
                as: 'district',
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
            });

            // Một Ward có thể có nhiều địa chỉ
            Ward.hasMany(models.Address, {
                foreignKey: "ward_id",
                onUpdate: "CASCADE",
                onDelete: "SET NULL",
            });
        }
    }
    Ward.init({
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        district_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: "districts",
                key: "id",
            },
            onDelete: "CASCADE",
        },
    }, {
        sequelize,
        modelName: 'Ward',
        timestamps: false // Không createdAt, updatedAt
    });
    return Ward;
};