import HttpErrors from "../../common/errors/http-errors";
import * as FavoriteService from "../services/favorite.service";

export const fetchFavoritesByUser = async (req, res) => {
    try {
        const user_id = req.params.userId;
        const response = await FavoriteService.fetchFavoritesByUser(user_id);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status || HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message || 'UNKNOWN',
            body: error?.body ?? {}
        })
    }
}

export const favoriteProductByUser = async (req, res) => {
    try {
        const user_id = req.user.id;
        const product_id = req.params.productId;
        const response = await FavoriteService.favoriteProductByUser(user_id, product_id);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status || HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message || 'UNKNOWN',
            body: error?.body ?? {}
        })
    }
}

export const unfavoriteProductByUser = async (req, res) => {
    try {
        const user_id = req.user.id;
        const product_id = req.params.productId;
        const response = await FavoriteService.unfavoriteProductByUser(user_id, product_id);
        return res.status(response.status).json(response);
    } catch (error) {
        return res.status(error?.status).json({
            status: error?.status || HttpErrors.INTERNAL_SERVER_ERROR,
            message: error?.message || 'UNKNOWN',
            body: error?.body ?? {}
        })
    }
}