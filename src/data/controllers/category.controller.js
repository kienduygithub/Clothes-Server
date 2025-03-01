import * as categoryServices from "../services/category.service";

export const fetchCategories = async (req, res) => {
    try {
        const response = await categoryServices.fetchCategories();
        return res.status(response?.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const fetchCategoryBoth = async (req, res) => {
    try {
        const response = await categoryServices.fetchCategoryBoth();
        return res.status(response?.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const fetchCategoryByParentId = async (req, res) => {
    try {
        const parentId = req.params.parent;
        const response = await categoryServices.fetchCategoryByParentId(parentId);
        return res.status(response?.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const addNewCategory = async (req, res) => {
    try {
        const categoryInfo = req.body.categoryInfo;
        const categoryFile = req.file;
        const response = await categoryServices.addNewCategory(categoryInfo, categoryFile);
        return res.status(response?.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const editCategory = async (req, res) => {
    try {
        const parentId = req.params.parent;
        const categoryInfo = req.body.categoryInfo;
        const categoryFile = req.file;
        const response = await categoryServices.editCategory(parentId, categoryInfo, categoryFile);
        return res.status(response?.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const deleteCategory = async (req, res) => {
    try {
        const parentId = req.params.parent;
        const response = await categoryServices.deleteCategory(parentId);
        return res.status(response?.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const addNewSubCategoryToParent = async (req, res) => {
    try {
        const parentId = req.params.parent;
        const data = req.body;
        const response = await categoryServices.addNewSubCategoryToParent(parentId, data);
        return res.status(response?.status).json(response);
    } catch (error) {
        console.log(error);
        return res.status(error?.status).json({
            status: error?.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const editSubCategory = async (req, res) => {
    try {
        const parentId = req.params.parent;
        const subCategoryId = req.params.subcategory;
        const data = req.body;
        const response = await categoryServices.editSubCategory(parentId, subCategoryId, data);
        return res.status(response?.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const deleteSubCategory = async (req, res) => {
    try {
        const parentId = req.params.parent;
        const subCategoryId = req.params.subcategory;
        const response = await categoryServices.deleteSubCategory(parentId, subCategoryId);
        return res.status(response?.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}