import { ResponseModel } from "../../common/errors/response";
import { Color, Size } from "../models";

const fetchAllColors = async () => {
    try {
        const colors = await Color.findAll({
            attributes: { exclude: ['createdAt', 'updatedAt'] }
        });
        const payload = {
            colors: colors
        };
        return ResponseModel.success('Danh sách màu sắc.', payload);
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

const fetchAllSizes = async () => {
    try {
        const sizes = await Size.findAll({
            attributes: { exclude: ['createdAt', 'updatedAt'] }
        });
        const payload = {
            sizes: sizes
        };
        return ResponseModel.success('Danh sách màu sắc.', payload);
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

module.exports = {
    fetchAllColors: fetchAllColors,
    fetchAllSizes: fetchAllSizes,
}