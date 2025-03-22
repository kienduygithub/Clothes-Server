import HttpErrors from "../../common/errors/http-errors";
import { ResponseModel } from "../../common/errors/response";
import { City, District, Ward, User, Address, sequelize } from "../models";

export const fetchCities = async () => {
    try {
        const cities = await City.findAll();
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
        const districts = await District.findAll({
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
        const wards = await Ward.findAll({
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

export const fetchAddressesByUserId = async (user_id) => {
    const t = await sequelize.transaction();
    try {
        if (!user_id) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                user_id: user_id ?? ''
            });
        }

        const user = await User.findOne({
            where: { id: user_id },
            transaction: t
        });

        if (!user) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Người dùng không tồn tại', {});
        }

        const addresses = await Address.findAll({
            where: { userId: user_id },
            transaction: t
        });

        const payload = {
            addresses: addresses
        }

        await t.commit();

        return ResponseModel.success('Danh sách địa chỉ', payload);
    } catch (error) {
        await t.rollback();
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const fetchAddressById = async (address_id) => {
    const t = await sequelize.transaction();
    try {
        if (!address_id) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                address_id: address_id ?? ''
            });
        }
        const address = await Address.findOne({
            where: { id: address_id },
            transaction: t
        });

        if (!address) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Địa chỉ không tồn tại', {});
        }

        const payload = {
            addresses: [address]
        }

        await t.commit();

        return ResponseModel.success('Danh sách địa chỉ', payload);
    } catch (error) {
        await t.rollback();
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const addNewAddressByUser = async (user_id, addressInfo) => {
    const t = await sequelize.transaction();
    try {

    } catch (error) {
        await t.rollback();
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const editAddressByUser = async (user_id, addressInfo) => {
    const t = await sequelize.transaction();
    try {

    } catch (error) {
        await t.rollback();
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const deleteAddressById = async (address_id) => {
    const t = await sequelize.transaction();
    try {
        if (!address_id) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                address_id: address_id ?? ''
            });
        }

        const address = await Address.findOne({
            where: { id: address_id },
            transaction: t
        });

        if (!address) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Địa chỉ không tồn tại', {});
        }

        await address.destroy({ transaction: t });

        await t.commit();

        return ResponseModel.success(`Xóa địa chỉ ${address.id} thành công`, {});
    } catch (error) {
        await t.rollback();
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

// const districts = await City.findOne({
//     where: { id: 1 },
//     include: [
//         {
//             model: District,
//             as: 'districts',
//         }
//     ]
// })