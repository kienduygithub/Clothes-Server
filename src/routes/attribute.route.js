import express from "express";
import {
    fetchAllColors,
    fetchAllSizes
} from "../data/controllers/attribute.controller";

const AttributeRouter = express.Router();

AttributeRouter.get('/attr/color', fetchAllColors);

AttributeRouter.get('/attr/size', fetchAllSizes);

export default AttributeRouter;