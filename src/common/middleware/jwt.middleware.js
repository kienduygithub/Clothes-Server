import jwt from "jsonwebtoken";
import dotenv from "dotenv";
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