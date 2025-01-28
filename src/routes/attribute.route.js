import express from "express";
import {
    fetchAllColors,
    fetchAllSizes
} from "../data/controllers/attribute.controller";

const attributeRouter = express.Router();

attributeRouter.get('/attr/color', fetchAllColors);

attributeRouter.get('/attr/size', fetchAllSizes);

export default attributeRouter;