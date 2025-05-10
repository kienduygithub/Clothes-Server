import HttpErrors from "../../common/errors/http-errors"
import { ResponseModel } from "../../common/errors/response"

export const fetchListNotificationUser = async (user_id) => {
    try {

    } catch (error) {
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}