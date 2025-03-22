import express from "express";
import { checkUserAuthentication } from "../common/middleware/jwt.middleware";
import * as AddressController from "../data/controllers/address.controller";

const AddressRouter = express.Router();

AddressRouter.get(
    '/address/cities',
    // checkUserAuthentication,
    AddressController.fetchCities
);

AddressRouter.get(
    '/address/districts/:cityId',
    // checkUserAuthentication,
    AddressController.fetchDistrictsByCityId
);

AddressRouter.get(
    '/address/wards/:districtId',
    // checkUserAuthentication,
    AddressController.fetchWardsByDistrictId
)

export default AddressRouter;