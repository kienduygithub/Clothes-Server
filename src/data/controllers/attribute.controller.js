import attributeService from '../services/attribute.service';

const fetchAllColors = async (req, res) => {
    try {
        const response = await attributeService.fetchAllColors();
        return res.status(response?.status).json(response);
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

const fetchAllSizes = async (req, res) => {
    try {
        const response = await attributeService.fetchAllSizes();
        return res.status(response?.status).json(response);
    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}

module.exports = {
    fetchAllColors: fetchAllColors,
    fetchAllSizes: fetchAllSizes,
}