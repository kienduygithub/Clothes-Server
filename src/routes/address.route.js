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
);

AddressRouter.get(
    '/address/:userId',
    // checkUserAuthentication,
    AddressController.fetchAddressesByUserId
);

AddressRouter.get(
    '/address/details/:addressId',
    // checkUserAuthentication,
    AddressController.fetchAddressById
);

AddressRouter.post(
    '/address/:userId',
    // checkUserAuthentication,
    AddressController.addNewAddressByUser
);

AddressRouter.put(
    '/address/:addressId',
    // checkUserAuthentication,
    AddressController.editAddressByUser
);

AddressRouter.delete(
    '/address/:addressId',
    // checkUserAuthentication,
    AddressController.deleteAddressById
);

export default AddressRouter;