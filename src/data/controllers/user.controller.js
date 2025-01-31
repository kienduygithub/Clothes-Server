import userServices from "../services/user.service";

const fetchAllUser = async (req, res) => {
    try {
        const response = await userServices.fetchAllUser();
        return res.status(response?.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

const fetchUserById = async (req, res) => {
    try {
        const userId = req.params.id;
        const response = await userServices.fetchUserById(userId);
        return res.status(response?.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

// Admin tạo người dùng để quản lý shop
const createUserAdmin = async (req, res) => {
    try {
        const response = await userServices.createUserAdmin(req.body.info, req.file);
        return res.status(response?.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

// Admin xóa người dùng quản lý shop
const deleteUserAdmin = async (req, res) => {
    try {
        const userId = req.params.id;
        const response = await userServices.deleteUserAdmin(userId);
        return res.status(response?.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

module.exports = {
    fetchAllUser: fetchAllUser,
    fetchUserById: fetchUserById,
    createUserAdmin: createUserAdmin,
    deleteUserAdmin: deleteUserAdmin
}

