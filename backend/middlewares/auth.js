const jwt = require("jsonwebtoken");
const db = require("../utils/dbConnect");
const ApiErrorResponce = require("../utils/ApiErrorResponce");

const cookieOptions = {
    httpOnly: true,
    secure: true,
    expire: Date.now() + 1000 * 60 * 60 * process.env.COOKIE_EXPIRE, // 8 hours
    path: "/",
    sameSite: true,
};

const authMiddleware = async (req, res, next) => {
    let token = req.cookies?.token || req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
        return res
            .status(400)
            .json(
                new ApiErrorResponce(
                    400,
                    {},
                    "Not authorized or token expires, Please login again",
                    true
                )
            );
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const tenantId = decoded.tenantId;

        if (!tenantId || !decoded.id || !decoded.sessionId) {
            return res
                .status(400)
                .clearCookie("token", cookieOptions)
                .json(new ApiErrorResponce(400, {}, "Invalid token, Please login again", true));
        }
        const [rows] = await db.query("SELECT * FROM users_" + tenantId + " WHERE id = ?", [
            decoded.id,
        ]);

        if (rows.length > 0) {
            if (decoded.sessionId !== rows[0].seasson_id) {
                return res
                    .status(401)
                    .clearCookie("token", cookieOptions)
                    .json(
                        new ApiErrorResponce(401, {}, "Session expired, Please login again", true)
                    );
            }
            const user = { ...rows[0] };
            user.tenantId = tenantId;
            delete user.password;
            delete user.sessionId;
            req.user = user;
            next();
        } else {
            return res
                .status(401)
                .clearCookie("token", cookieOptions)
                .json(
                    new ApiErrorResponce(401, undefined, "User not found, Please login again", true)
                );
        }
    } catch (error) {
        return res
            .status(401)
            .clearCookie("token", cookieOptions)
            .json(new ApiErrorResponce(401, {}, "Invalid token, Please login again", true));
    }
};

const isAdmin = async (req, res, next) => {
    if (!req.user) {
        return res
            .status(401)
            .json(new ApiErrorResponce(401, {}, "Not authorized, Please login again"));
    }
    const { role } = req.user;
    if (role?.toLowerCase() !== "admin") {
        return res.status(403).json(new ApiErrorResponce(403, {}, "Access denied, Admin only"));
    }
    next();
};

const isUser = async (req, res, next) => {
    if (!req.user) {
        return res
            .status(401)
            .json(new ApiErrorResponce(401, {}, "Not authorized, Please login again"));
    }
    const { role } = req.user;
    if (role?.toLowerCase() !== "user" && role?.toLowerCase() !== "admin") {
        return res.status(403).json(new ApiErrorResponce(403, {}, "Access denied"));
    }
    next();
};

module.exports = {
    authMiddleware,
    isAdmin,
    isUser,
};
