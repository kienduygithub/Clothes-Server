import express from "express";
import { checkUserAuthentication, checkUserAuthenticationMobile } from "../common/middleware/jwt.middleware";
import * as AddressController from "../data/controllers/address.controller";

const AddressRouter = express.Router();

AddressRouter.get(
    '/address/cities',
    checkUserAuthenticationMobile,
    AddressController.fetchCities
);

AddressRouter.get(
    '/address/districts/:cityId',
    checkUserAuthenticationMobile,
    AddressController.fetchDistrictsByCityId
);

AddressRouter.get(
    '/address/wards/:districtId',
    checkUserAuthenticationMobile,
    AddressController.fetchWardsByDistrictId
);

AddressRouter.get(
    '/address',
    checkUserAuthenticationMobile,
    AddressController.fetchAddressesByUserId
);

AddressRouter.get(
    '/address/details/:addressId',
    checkUserAuthenticationMobile,
    AddressController.fetchAddressById
);

AddressRouter.get(
    '/address/default',
    checkUserAuthenticationMobile,
    AddressController.fetchDefaultAddressUser
);

AddressRouter.post(
    '/address',
    checkUserAuthenticationMobile,
    AddressController.addNewAddressByUser
);

AddressRouter.put(
    '/address/:addressId',
    checkUserAuthenticationMobile,
    AddressController.editAddressByUser
);

AddressRouter.delete(
    '/address/:addressId',
    checkUserAuthenticationMobile,
    AddressController.deleteAddressById
);

AddressRouter.patch(
    '/address/:addressId',
    checkUserAuthenticationMobile,
    AddressController.updateAddressAsDefault
);

export default AddressRouter;