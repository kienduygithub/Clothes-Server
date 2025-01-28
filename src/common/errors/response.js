const HttpErrors = require("./http-errors");

export class ResponseModel {
    constructor(statusCode, message, body = null) {
        this.status = statusCode ?? HttpErrors.INTERNAL_SERVER_ERROR;
        this.message = message;
        this.body = body;
    }

    static success(message, data = null) {
        return new ResponseModel(200, message, data);
    }

    static error(status, message, data = null) {
        throw new ResponseModel(status, message, data);
    }
}