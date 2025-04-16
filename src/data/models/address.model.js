'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Address extends Model {
        static associate(models) {
            Address.belongsTo(models.User, {
                foreignKey: 'userId',
                as: 'user',
                onDelete: "CASCADE"
            });

            Address.belongsTo(models.City, {
                foreignKey: "city_id",
                as: 'city',
                onDelete: "SET NULL"
            });

            Address.belongsTo(models.District, {
                foreignKey: "district_id",
                as: 'district',
                onDelete: "SET NULL",
            });

            Address.belongsTo(models.Ward, {
                foreignKey: "ward_id",
                as: 'ward',
                onDelete: "SET NULL",
            });

            Address.hasMany(models.Order, {
                foreignKey: 'address_id',
                as: 'orders',
                onDelete: "SET NULL",
            });
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
            onDelete: "SET NULL"
        },
        ward_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'wards',
                key: 'id'
            },
            onDelete: "SET NULL",
        },
        address_detail: DataTypes.STRING,
        is_default: DataTypes.BOOLEAN,
        name: DataTypes.STRING,
        phone: DataTypes.STRING,

        // Helper
        city_name: {
            type: DataTypes.VIRTUAL,
            get() {
                return this.city ? this.city.name : '';
            }
        },
        district_name: {
            type: DataTypes.VIRTUAL,
            get() {
                return this.district ? this.district.name : '';
            }
        },
        ward_name: {
            type: DataTypes.VIRTUAL,
            get() {
                return this.ward ? this.ward.name : '';
            }
        }
    }, {
        sequelize,
        modelName: 'Address',
    });
    return Address;
};