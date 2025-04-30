import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { ResponseModel } from "../errors/response";
import HttpErrors from "../errors/http-errors";
dotenv.config();

const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET;
const ACCESS_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES_IN;
const REFRESH_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES_IN;

export const generalAccessToken = (payload) => {
    const accessToken = jwt.sign(
        { ...payload },
        ACCESS_SECRET,
        { expiresIn: ACCESS_EXPIRES }
    );

    return accessToken;
}

export const generalRefreshToken = (payload) => {
    const refreshToken = jwt.sign(
        { ...payload },
        REFRESH_SECRET,
        { expiresIn: REFRESH_EXPIRES }
    );

    return refreshToken;
}

export const refreshTokenWeb = async (req, res) => {
    try {
        const token = req.body.refreshToken;
        if (!token) {
            return res.status(401).json({
                status: HttpErrors.UNAUTHORIZED,
                message: 'Không có refresh token',
                body: null
            });
        }

        jwt.verify(token, REFRESH_SECRET, (err, decoded) => {
            if (err) {
                return res.status(HttpErrors.UNAUTHORIZED).json({
                    status: HttpErrors.UNAUTHORIZED,
                    message: 'Refresh token hết hạn hoặc không hợp lệ',
                    body: null
                })
            }
            const payload = {
                id: decoded?.id,
                name: decoded?.name,
                image_url: decoded?.image_url,
                roles: decoded?.roles,
            }

            const accessToken = generalAccessToken(payload);
            return res.status(200).json({
                access_token: accessToken
            });
        });
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status,
            message: error?.message ?? 'UNKNOWN',
            body: error?.body
        })
    }
}

export const checkUserAuthentication = (req, res, next) => {
    try {
        const accessToken = req.headers.authorization?.split(" ")[1];
        if (!accessToken) {
            return res.status(401).json({
                status: HttpErrors.UNAUTHORIZED,
                message: 'Không có access token',
                body: null
            });
        }

        jwt.verify(accessToken, ACCESS_SECRET, (err, decoded) => {
            if (err) {
                return res.status(401).json({
                    status: HttpErrors.UNAUTHORIZED,
                    message: 'Access token hết hạn hoặc không hợp lệ',
                    body: null
                })
            }

            req.user = decoded;
            next();
        })
    } catch (error) {
        return res.status(error?.status || 500).json({
            status: error?.status,
            message: error?.message || 'UNKNOWN',
            body: error?.body
        });
    }
}

export const checkUserAuthenticationMobile = async (req, res, next) => {
    try {
        const accessToken = req.headers.authorization?.split(" ")[1];
        if (!accessToken) {
            return res.status(HttpErrors.UNAUTHORIZED).json({
                status: HttpErrors.UNAUTHORIZED,
                message: 'Không có access token',
                body: {}
            });
        }

        const decoded = jwt.verify(accessToken, ACCESS_SECRET);

        req.user = decoded;
        next();
    } catch (error) {
        let statusCode = HttpErrors.UNAUTHORIZED;
        let message = 'Token không hợp lệ';
        if (error.name === 'TokenExpiredError') {
            message = 'Token đã hết hạn';
        } else if (error.name === 'JsonWebTokenError') {
            message = 'Token sai hoặc bị chỉnh sửa';
        } else if (error.name === 'NotBeforeError') {
            message = 'Token chưa có hiệu lực';
        }

        return res.status(statusCode).json({
            status: statusCode,
            message,
            body: {}
        });
    }
}

export const refreshTokenMobile = async (req, res) => {
    try {
        const token = req.body['refresh-token'];
        if (!token) {
            return res.status(401).json({
                status: HttpErrors.UNAUTHORIZED,
                message: 'Không có refresh token',
                body: null
            });
        }

        const decoded = jwt.verify(token, REFRESH_SECRET);

        const payload = {
            id: decoded?.id,
            name: decoded?.name,
            image_url: decoded?.image_url,
            roles: decoded?.roles,
        }

        const accessToken = generalAccessToken(payload);
        return res.status(200).json({
            access_token: accessToken
        });
    } catch (error) {
        let statusCode = HttpErrors.UNAUTHORIZED;
        let message = 'Token không hợp lệ';
        if (error.name === 'TokenExpiredError') {
            message = 'Token đã hết hạn';
        } else if (error.name === 'JsonWebTokenError') {
            message = 'Token sai hoặc bị chỉnh sửa';
        } else if (error.name === 'NotBeforeError') {
            message = 'Token chưa có hiệu lực';
        }

        return res.status(statusCode).json({
            status: statusCode,
            message,
            body: {}
        });
    }
}