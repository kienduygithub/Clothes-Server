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

        const userId = req.body.userId;
        let parsedUserId = JSON.parse(userId);
        let id;
        if (parsedUserId !== 0) {
            id = parsedUserId;
        } else {
            id = null;
        }

        const response = await authServices.signUp(
            userInfo,
            shopInfo,
            files,
            id
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

