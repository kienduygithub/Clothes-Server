import HttpErrors from "../../common/errors/http-errors";
import { ResponseModel } from "../../common/errors/response";
import * as AddressService from "../services/address.service";

export const fetchCities = async (req, res) => {
    try {
        const response = await AddressService.fetchCities();
        return res.status(response?.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status ?? HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const fetchDistrictsByCityId = async (req, res) => {
    try {
        const city_id = req.params.cityId;
        const response = await AddressService.fetchDistrictsByCityId(city_id);
        return res.status(response?.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status ?? HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const fetchWardsByDistrictId = async (req, res) => {
    try {
        const district_id = req.params.districtId;
        const response = await AddressService.fetchWardsByDistrictId(district_id);
        return res.status(response?.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status ?? HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const fetchAddressesByUserId = async (req, res) => {
    try {
        const user_id = req.params.userId;
        const response = await AddressService.fetchAddessesByUserId(user_id);
        return res.status(response?.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status ?? HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const fetchAddressById = async (req, res) => {
    try {
        const address_id = req.params.addressId;
        const response = await AddressService.fetchAddressById(address_id);
        return res.status(response?.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status ?? HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const addNewAddressByUser = async (req, res) => {
    try {
        const user_id = req.params.userId;
        const addressInfo = req.body;
        const response = await AddressService.addNewAddressByUser(user_id, addressInfo);
        return res.status(response?.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status ?? HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const editAddressByUser = async (req, res) => {
    try {
        const address_id = req.params.addressId;
        const addressInfo = req.body;
        const response = await AddressService.editAddressByUser(address_id, addressInfo);
        return res.status(response?.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status ?? HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const deleteAddressById = async (req, res) => {
    try {
        const address_id = req.params.addressId;
        const response = await AddressService.deleteAddressById(address_id);
        return res.status(response?.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status ?? HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}