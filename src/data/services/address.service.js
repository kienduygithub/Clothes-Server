import { ResponseModel } from "../../common/errors/response";
// import { City, District, Ward } from "../models";
import db from "../models";

export const fetchCities = async () => {
    try {
        const cities = await db.City.findAll();
        const payload = {
            cities: cities
        }
        return ResponseModel.success('Danh sách Tỉnh/Thành phố', payload);
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const fetchDistrictsByCityId = async (city_id) => {
    try {
        const districts = await db.District.findAll({
            where: { city_id: city_id }
        });
        const payload = {
            districts: districts
        }
        return ResponseModel.success('Danh sách Quận/Huyện', payload);
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const fetchWardsByDistrictId = async (district_id) => {
    try {
        const wards = await db.Ward.findAll({
            where: { district_id: district_id }
        });
        const payload = {
            wards: wards
        }
        return ResponseModel.success('Danh sách Phường/Xã', payload);
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}
