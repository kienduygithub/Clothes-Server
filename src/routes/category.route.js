import express from "express";
import {
    uploadServer
} from '../common/middleware/upload.middleware';
import * as CategoryController from "../data/controllers/category.controller";

const CategoryRouter = express.Router();

CategoryRouter.get('/category/all', CategoryController.fetchCategories);

CategoryRouter.get('/category/:parent', CategoryController.fetchCategoryByParentId);

CategoryRouter.get('/category/count-products');

CategoryRouter.post(
    '/category',
    uploadServer.single('categoryFile'),
    CategoryController.addNewCategory
);

CategoryRouter.put(
    '/category/:parent',
    uploadServer.single('categoryFile'),
    CategoryController.editCategory
);

CategoryRouter.delete('/category/:parent', CategoryController.deleteCategory);

CategoryRouter.post('/category/:parent/subcategories', CategoryController.addNewSubCategoryToParent);

CategoryRouter.put('/category/:parent/subcategories/:subcategory', CategoryController.editSubCategory);

CategoryRouter.delete('/category/:parent/subcategories/:subcategory', CategoryController.deleteSubCategory);

export default CategoryRouter;