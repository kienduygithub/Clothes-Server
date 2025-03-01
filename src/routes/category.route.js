import express from "express";
import {
    uploadServer
} from '../common/middleware/upload.middleware';
import * as CategoryController from "../data/controllers/category.controller";
import { checkUserAuthentication } from "../common/middleware/jwt.middleware";

const CategoryRouter = express.Router();

CategoryRouter.get(
    '/category/all',
    CategoryController.fetchCategories
);

CategoryRouter.get(
    '/category/all/both',
    CategoryController.fetchCategoryBoth
)

CategoryRouter.get(
    '/category/:parent',
    checkUserAuthentication,
    CategoryController.fetchCategoryByParentId
);

CategoryRouter.get('/category/count-products');

CategoryRouter.post(
    '/category',
    checkUserAuthentication,
    uploadServer.single('categoryFile'),
    CategoryController.addNewCategory
);

CategoryRouter.put(
    '/category/:parent',
    checkUserAuthentication,
    uploadServer.single('categoryFile'),
    CategoryController.editCategory
);

CategoryRouter.delete(
    '/category/:parent',
    checkUserAuthentication,
    CategoryController.deleteCategory
);

CategoryRouter.post(
    '/category/:parent/subcategories',
    checkUserAuthentication,
    CategoryController.addNewSubCategoryToParent
);

CategoryRouter.put(
    '/category/:parent/subcategories/:subcategory',
    checkUserAuthentication,
    CategoryController.editSubCategory
);

CategoryRouter.delete(
    '/category/:parent/subcategories/:subcategory',
    checkUserAuthentication,
    CategoryController.deleteSubCategory
);

export default CategoryRouter;