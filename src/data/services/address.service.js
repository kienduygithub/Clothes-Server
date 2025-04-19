import { Op } from "sequelize";
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
            include: [
                {
                    model: City,
                    as: 'city',
                    attributes: ['id', 'name']
                },
                {
                    model: District,
                    as: 'district',
                    attributes: ['id', 'name']
                },
                {
                    model: Ward,
                    as: 'ward',
                    attributes: ['id', 'name']
                }
            ],
            attributes: { exclude: ['updatedAt'] },
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
            include: [
                {
                    model: City,
                    as: 'city',
                    attributes: ['id', 'name']
                },
                {
                    model: District,
                    as: 'district',
                    attributes: ['id', 'name']
                },
                {
                    model: Ward,
                    as: 'ward',
                    attributes: ['id', 'name']
                }
            ],
            attributes: { exclude: ['updatedAt'] },
            transaction: t
        });

        if (!address) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Địa chỉ không tồn tại', {});
        }

        delete address.dataValues.city_id;
        delete address.dataValues.district_id;
        delete address.dataValues.ward_id;

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

export const fetchDefaultAddressUser = async (user_id) => {
    const t = await sequelize.transaction();
    try {
        if (!user_id) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                user_id: user_id ?? ''
            });
        }
        const address = await Address.findOne({
            where: {
                userId: user_id,
                is_default: true
            },
            include: [
                {
                    model: City,
                    as: 'city',
                    attributes: ['id', 'name']
                },
                {
                    model: District,
                    as: 'district',
                    attributes: ['id', 'name']
                },
                {
                    model: Ward,
                    as: 'ward',
                    attributes: ['id', 'name']
                }
            ],
            attributes: { exclude: ['updatedAt'] },
            transaction: t
        });

        if (!address) {
            const payload = {
                addresses: []
            }
            return ResponseModel.success('Danh sách địa chỉ', payload);
        }

        delete address.dataValues.city_id;
        delete address.dataValues.district_id;
        delete address.dataValues.ward_id;

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
        if (!user_id || !addressInfo) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                user_id: user_id ?? '',
                addressInfo: addressInfo ?? {}
            });
        }

        const user = await User.findOne({
            where: { id: user_id },
            transaction: t
        });

        if (!user) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Người dùng không tồn tại', {});
        }

        const {
            name,
            phone,
            city_id,
            district_id,
            ward_id,
            address_detail,
            is_default
        } = addressInfo;

        if (is_default) {
            await Address.update(
                { is_default: false },
                {
                    where: { userId: user_id },
                    transaction: t
                }
            );
        }

        const createdAddress = await Address.create({
            userId: user_id,
            city_id: city_id,
            district_id: district_id,
            ward_id: ward_id,
            address_detail: address_detail,
            name: name,
            phone: phone,
            is_default: is_default
        }, { transaction: t });

        await t.commit();

        const payload = {
            addresses: [createdAddress]
        }
        return ResponseModel.success('Tạo địa chỉ thành công', payload);
    } catch (error) {
        await t.rollback();
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const editAddressByUser = async (user_id, address_id, addressInfo) => {
    const t = await sequelize.transaction();
    try {
        if (!user_id || !address_id || !addressInfo) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                user_id: user_id ?? '',
                address_id: address_id ?? '',
                addressInfo: addressInfo ?? {}
            });
        }


        const address = await Address.findOne({
            where: { id: address_id },
            transaction: t
        });

        if (!address) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Địa chỉ không tồn tại', {});
        }

        const {
            name,
            phone,
            city_id,
            district_id,
            ward_id,
            address_detail,
            is_default
        } = addressInfo;

        if (is_default) {
            await Address.update(
                { is_default: false },
                {
                    where: {
                        userId: user_id,
                        is_default: true
                    },
                    transaction: t
                }
            );
        }

        const updatedAddress = await address.update({
            name: name,
            phone: phone,
            city_id: city_id,
            district_id: district_id,
            ward_id: ward_id,
            address_detail: address_detail,
            is_default: is_default
        }, { transaction: t });

        await t.commit();

        const payload = {
            addresses: [updatedAddress]
        }

        return ResponseModel.success(`Cập nhật địa chỉ thành công`, payload);
    } catch (error) {
        await t.rollback();
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const deleteAddressById = async (user_id, address_id) => {
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

        if (address.is_default) {
            /** Tìm địa chỉ mới nhất của cùng user_id (Không phải địa chỉ đang xóa) */
            const latestAddress = await Address.findOne({
                where: {
                    userId: user_id,
                    id: { [Op.ne]: address_id } /** Không lấy địa chỉ đang xóa */
                },
                order: [['createdAt', 'DESC']],
                transaction: t
            });

            if (latestAddress) {
                await latestAddress.update({
                    is_default: true
                }, { transaction: t });
            }
        }

        await address.destroy({ transaction: t });

        await t.commit();

        return ResponseModel.success(`Xóa địa chỉ ${address.id} thành công`, {});
    } catch (error) {
        await t.rollback();
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

export const updateAddressAsDefault = async (user_id, address_id) => {
    const t = await sequelize.transaction();
    try {
        if (!user_id || !address_id) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                user_id: user_id ?? '',
                address_id: address_id ?? ''
            });
        }

        const user = await User.findOne({
            where: { id: user_id },
            transaction: t
        });

        if (!user) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Người dùng không tồn tại', {});
        }

        const address = await Address.findOne({
            where: { id: address_id, userId: user_id },
            transaction: t
        });

        if (!address) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Địa chỉ không tồn tại', {});
        }

        await Address.update(
            { is_default: false },
            {
                where: {
                    userId: user_id,
                    is_default: true
                },
                transaction: t
            }
        );

        await address.update({
            is_default: true
        }, { transaction: t });

        await t.commit();

        return ResponseModel.success(`Đặt địa chỉ ${address.id} làm địa chỉ mặc định thành công`, {});
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