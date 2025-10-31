import jwt from "jsonwebtoken";
import envConfig from "../configs/env.config.js";
import { StatusCodes } from "http-status-codes";
import userModel from "../models/user.model.js";
const JWT_SECRET = envConfig.JWT_SECRET;

const authMiddleware = (optional=false) => async (req, res, next) => {
    try {
        let token = "";
        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith("Bearer ")
        ) {
            token = req.headers.authorization.split(" ")[1];
        } else if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }
        if (!token) {
            throw new Error("Unauthorized");
        }
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await userModel.findById(decoded.userId).select("-password").lean();

        if (!user) {
            throw new Error("Unauthorized");
        }
        req.user = user;
        next();
    } catch (error) {
        if (optional && error.message === "Unauthorized") {
            return next();
        }
        return res.status(StatusCodes.UNAUTHORIZED).json({
            success: false,
            message: error.message,
        });
    }
};

export default authMiddleware;
