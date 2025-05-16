'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Withdrawal extends Model {
        static associate(models) {
            Withdrawal.belongsTo(models.Shop, {
                foreignKey: 'shop_id',
                as: 'shop',
                onDelete: 'CASCADE'
            });
        }
    }

    Withdrawal.init({
        shop_id: {
            type: DataTypes.INTEGER,
            references: {
                model: 'shops',
                key: 'id'
            },
            onDelete: 'CASCADE'
        },
        amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
        },
    }, {
        sequelize,
        modelName: 'Withdrawal',
    });
    return Withdrawal;
};