import * as userServices from "../services/user.service";

export const fetchAllUser = async (req, res) => {
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

export const fetchUserById = async (req, res) => {
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
export const createUserAdmin = async (req, res) => {
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
export const deleteUserAdmin = async (req, res) => {
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

// Admin cập nhật người dùng quản lý shop
export const updateUserAdmin = async (req, res) => {
    try {
        const userId = req.params.id;
        const info = req.body.info;
        const file = req.file;
        const response = await userServices.updateUserAdmin(userId, info, file);
        return res.status(response?.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

/** MOBILE */
export const fetchUserInfo = async (req, res) => {
    try {
        const userId = req.user.id;
        const response = await userServices.fetchUserInfo(userId);
        return res.status(response?.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const editUserInfo = async (req, res) => {
    try {
        const userId = req.user.id;
        const userInfo = req.body;
        const response = await userServices.editUserInfo(userId, userInfo);
        return res.status(response?.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const editAvatarUser = async (req, res) => {
    try {
        const userId = req.user.id;
        const file = req.file;
        const response = await userServices.editAvatarUser(userId, file);
        return res.status(response?.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}
