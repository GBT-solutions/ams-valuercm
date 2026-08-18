const ApiResponse = require("./ApiResponse");
class ApiErrorResponce extends ApiResponse {
    constructor(statusCode, data = {}, message = "Something went wrong", seassonExpired = false) {
        super(statusCode, data, message);
        this.success = false;
        this.seassonExpired = seassonExpired;
    }
}
module.exports = ApiErrorResponce;
