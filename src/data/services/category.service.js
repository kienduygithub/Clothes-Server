import { literal, Op } from "sequelize";
import HttpErrors from "../../common/errors/http-errors";
import { ResponseModel } from "../../common/errors/response";
import { handleDeleteImageAsFailed, handleDeleteImages } from "../../common/middleware/upload.middleware";
import { Category, Product } from "../models";

export const fetchCategories = async () => {
    try {
        const categories = await Category.findAll({
            where: { parentId: null },
            attributes: {
                include: [
                    // Đếm tổng số sản phẩm trong tất cả category con
                    [literal(
                        `(
                            SELECT COUNT(*)
                            FROM products AS p
                            JOIN categories AS c ON p.categoryId = c.id
                            WHERE c.parentId = Category.id
                        )`
                    ), 'count']
                ]
            },
            include: {
                model: Category,
                as: 'children'
            },
            order: [['createdAt', 'DESC']]
        })

        const payload = {
            categories: categories.map((category) => {
                let data = category.dataValues;
                return ({
                    ...data,
                    description: data?.description === null ? '' : data?.description,
                    parentId: data?.parentId === null ? 0 : data?.parentId
                })
            })
        }

        return ResponseModel.success('Danh sách danh mục', payload);
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const fetchCategoryBoth = async () => {
    try {
        const categories = await Category.findAll({
            include: {
                model: Category,
                as: 'parent'
            }
        });

        const payload = {
            categories: categories.map((category) => {
                let data = category.dataValues;
                return ({
                    ...data,
                    description: data?.description === null ? '' : data?.description,
                    parentId: data?.parentId === null ? 0 : data?.parentId,
                })
            })
        }

        return ResponseModel.success('Danh sách danh mục', payload);
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const fetchCategoryByParentId = async (parent_id) => {
    try {
        if (!parent_id) {

            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu trường cần thiết', {
                parent_id: parent_id
            });
        }

        const category = await Category.findOne({
            where: { id: parent_id, parentId: null },
            include: {
                model: Category,
                as: 'children',
                attributes: {
                    exclude: ['description', 'image_url', 'createdAt', 'updatedAt']
                },

            },
            attributes: {
                exclude: ['createdAt', 'updatedAt'],
            },
            order: [
                [{ model: Category, as: 'children' }, 'createdAt', 'DESC']
            ]
        });

        if (!category) {
            ResponseModel.error(HttpErrors.NOT_FOUND, 'Không tìm thấy danh mục', null);
        }
        let { description, parentId } = category.dataValues;
        category.dataValues.description = description === null ? '' : description;
        category.dataValues.parentId = parentId === null ? '' : parentId;

        const payload = {
            categories: [category]
        };

        return ResponseModel.success(`Danh mục ${category.category_name}`, payload);
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const fetchCountProductOfCategory = async (productId) => {
    try {

    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const addNewCategory = async (categoryInfo, file) => {
    try {
        if (!categoryInfo) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu trường cần thiết', null);
        }
        const {
            category_name,
            description
        } = JSON.parse(categoryInfo);

        const existNameCategory = await Category.findOne({
            where: {
                category_name: category_name,
                parentId: null
            }
        });

        if (existNameCategory) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Tên danh mục đã tồn tại', null);
        }

        let image_url = null;
        if (file) {
            image_url = `categories/${file.filename}`;
        }

        const newCategory = await Category.create({
            category_name: category_name,
            description: description || null,
            parentId: null,
            image_url: image_url
        });

        const payload = {
            categories: [newCategory]
        }

        return ResponseModel.success("Tạo danh mục thành công", payload);
    } catch (error) {
        handleDeleteImageAsFailed(file);
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const editCategory = async (parent_id, categoryInfo, file) => {
    try {
        if (!parent_id || !categoryInfo) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu trường cần thiết', null);
        }

        const existCategory = await Category.findOne({
            where: { id: parent_id, parentId: null }
        });

        if (!existCategory) {
            ResponseModel.error(HttpErrors.NOT_FOUND, 'Không tìm thấy danh mục', null);
        }

        const {
            category_name,
            description
        } = JSON.parse(categoryInfo);

        const conflictCategoryName = await Category.findOne({
            where: {
                category_name: category_name,
                parentId: null,
                id: { [Op.ne]: parent_id }
            }
        });

        if (conflictCategoryName) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Tên danh mục đã tồn tại', null);
        }

        existCategory.category_name = category_name;
        existCategory.description = description;
        if (file) {
            const deleteFilename = existCategory.dataValues.image_url;
            await handleDeleteImages([deleteFilename]);
            existCategory.image_url = `categories/${file.filename}`;
        }

        await existCategory.save();
        const payload = {
            categories: [existCategory]
        }
        return ResponseModel.success('Chỉnh sửa danh mục thành công', payload);
    } catch (error) {
        handleDeleteImageAsFailed(file);
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const deleteCategory = async (parent_id) => {
    try {
        if (!parent_id) {
            return ResponseModel.error(HttpErrors.BAD_REQUEST, "Thiếu trường cần thiết", null);
        }

        const category = await Category.findOne({
            where: { id: parent_id, parentId: null }
        });

        if (!category) {
            return ResponseModel.error(HttpErrors.NOT_FOUND, "Không tìm thấy danh mục", null);
        }

        const subCategories = await Category.findAll({
            where: { parentId: parent_id }
        });

        if (subCategories.length > 0) {
            return ResponseModel.error(HttpErrors.BAD_REQUEST, "Không thể xóa danh mục cha khi còn danh mục con", null);
        }

        const deletedFilename = category.dataValues.image_url;

        if (deletedFilename !== '') {
            await handleDeleteImages([deletedFilename]);
        }

        await Category.destroy({
            where: { id: parent_id }
        });

        return ResponseModel.success("Xóa danh mục thành công", null);
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const addNewSubCategoryToParent = async (parent_id, data) => {
    try {
        const category_name = data?.category_name;

        if (!parent_id || !category_name) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu trường cần thiết', null);
        }

        const parentCategory = await Category.findOne({
            where: {
                id: parent_id,
                parentId: null
            }
        });

        if (!parentCategory) {
            ResponseModel.error(HttpErrors.NOT_FOUND, 'Không tìm thấy danh mục cha', null);
        }

        const existSubNameCategory = await Category.findOne({
            where: {
                parentId: parent_id,
                category_name: category_name,
            }
        })

        if (existSubNameCategory) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Tên thư mục con đã tồn tại', null);
        }

        const newSubCategory = await Category.create({
            category_name: category_name,
            parentId: parent_id
        });

        const payload = {
            subCategory: newSubCategory
        }

        return ResponseModel.success('Thêm danh mục con thành công', payload);
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const editSubCategory = async (parent_id, subCategory_id, data) => {
    try {
        const category_name = data?.category_name;

        if (!parent_id || !subCategory_id || !category_name) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu trường cần thiết', null);
        }

        const parentCategory = await Category.findOne({
            where: {
                id: parent_id,
                parentId: null
            }
        });

        if (!parentCategory) {
            ResponseModel.error(HttpErrors.NOT_FOUND, 'Không tìm thấy danh mục cha', null);
        }

        const subCategory = await Category.findOne({
            where: {
                id: subCategory_id,
                parentId: parent_id
            }
        });

        if (!subCategory) {
            ResponseModel.error(HttpErrors.NOT_FOUND, 'Không tìm thấy danh mục con cần chỉnh sửa', null);
        }

        const existSubNameCategory = await Category.findOne({
            where: {
                id: { [Op.ne]: subCategory_id },
                parentId: parent_id,
                category_name: category_name,
            }
        })

        if (existSubNameCategory) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Tên thư mục con đã tồn tại', null);
        }

        subCategory.category_name = category_name;

        const saveSubCategory = await subCategory.save();

        const payload = {
            subCategory: saveSubCategory
        }

        return ResponseModel.success('Chỉnh sửa danh mục con thành công', payload);
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const deleteSubCategory = async (parent_id, subCategory_id) => {
    try {
        if (!parent_id || !subCategory_id) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu trường cần thiết', null);
        }

        const existSubCategory = await Category.findOne({
            where: {
                id: subCategory_id,
                parentId: parent_id,
            }
        });

        if (!existSubCategory) {
            ResponseModel.error(HttpErrors.NOT_FOUND, 'Không tìm thấy danh mục cần xóa', null);
        }

        await Category.destroy({
            where: {
                id: subCategory_id
            }
        });

        return ResponseModel.success('Xóa danh mục con thành công', null);
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}
