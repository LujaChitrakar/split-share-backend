import express from "express";
import userController from "../controllers/auth/user.controller.js";
import "express-async-errors";
import authMiddleware from "../middlewares/auth.middleware.js";
import referalCodeController from "../controllers/referal/referalCode.controller.js";

const router = express.Router();

router.post("/user/check-username-availability", userController.checkUsernameAavailability);
router.post("/user/check-email-availability", userController.checkEmailAvailability);
router.get("/user/profile", authMiddleware(), userController.getProfile);
router.post("/user/profile/searchByWallet", authMiddleware(), userController.getUserByWalletAddress);
router.get("/user/profile/:friendId", authMiddleware(), userController.getUserById);
router.put("/user/profile", authMiddleware(), userController.updateProfile);

router.get("/referalCode", authMiddleware(), referalCodeController.getMyCurrentReferalCode);
router.post("/referalCode", authMiddleware(), referalCodeController.applyReferalCode);
router.post("/redeemCashback", authMiddleware(), referalCodeController.redeemPointsCashback);


export default router;
