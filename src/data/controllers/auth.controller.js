import * as authServices from "../services/auth.service";

export const signIn = async (req, res) => {
    try {
        const response = await authServices.signIn(req.body);
        return res.status(response?.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const signUp = async (req, res) => {
    try {
        const userInfo = req.body.userInfo;
        const shopInfo = req.body.shopInfo;
        const files = req.files;

        const response = await authServices.signUp(
            userInfo,
            shopInfo,
            files,
        );
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const response = await authServices.changePassword(userId, req.body);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const editAccountDetails = async (req, res) => {
    try {
        const user_id = req.user.id;
        const userInfo = req.body.userInfo;
        const file = req.file;
        const response = await authServices.editAccountDetails(
            user_id,
            userInfo,
            file
        );
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const signInMobile = async (req, res) => {
    try {
        const userInfo = req.body;
        const response = await authServices.signInMobile(userInfo);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const signUpMobile = async (req, res) => {
    try {
        const userInfo = req.body.userInfo;
        const file = req.file;
        const response = await authServices.signUpMobile(
            userInfo,
            file
        );
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const fetchDetailUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const response = await authServices.fetchDetailUser(userId);
        return res.status(response?.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const fetchDetailUserWithAuth = async (req, res) => {
    try {
        const userId = req.user.id;
        const response = await authServices.fetchDetailUser(userId);
        return res.status(response?.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const registerShopMobile = async (req, res) => {
    try {
        const userInfo = req.body.userInfo;
        const shopInfo = req.body.shopInfo;
        const files = req.files;
        const response = await authServices.registerShopMobile(
            userInfo,
            shopInfo,
            files
        );
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const checkUserForShopRegistration = async (req, res) => {
    try {
        const userInfo = req.body;
        const response = await authServices.checkUserForShopRegistration({
            email: userInfo.email,
            password: userInfo.password
        });
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const fetchNewShopsStats = async (req, res) => {
    try {
        const response = await authServices.fetchNewShopsStats(req.body);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const fetchInactiveShopsStats = async (req, res) => {
    try {
        const response = await authServices.fetchInactiveShopsStats(req.body);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const fetchOrderActivityStats = async (req, res) => {
    try {
        const response = await authServices.fetchOrderActivityStats(req.body);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const fetchProductPerformanceStats = async (req, res) => {
    try {
        const response = await authServices.fetchProductPerformanceStats(req.body);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const fetchShopRevenueStats = async (req, res) => {
    try {
        const response = await authServices.fetchShopRevenueStats(req.body);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}

export const fetchProductCategoryStats = async (req, res) => {
    try {
        const response = await authServices.fetchProductCategoryStats(req.body);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        });
    }
}


