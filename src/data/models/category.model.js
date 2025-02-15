'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Category extends Model {
        static associate(models) {
            // Liên kết cha-con trong cùng một bảng
            Category.hasMany(models.Category, {
                as: 'children',
                foreignKey: 'parentId',
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE'
            });
            Category.belongsTo(models.Category, {
                as: 'parent',
                foreignKey: 'parentId'
            });
            // Category.belongsToMany(models.Product, {
            //     through: models.ProductCategory,
            //     foreignKey: 'categoryId',
            //     otherKey: 'productId',
            //     as: 'products'
            // });
            Category.hasMany(models.Product, {
                foreignKey: 'categoryId',
                as: 'products'
            })
        }
    }
    Category.init({
        category_name: DataTypes.STRING,
        image_url: DataTypes.STRING,
        description: DataTypes.STRING,
        parentId: DataTypes.INTEGER
    }, {
        sequelize,
        modelName: 'Category',
    });
    return Category;
};