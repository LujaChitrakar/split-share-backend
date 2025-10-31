import express from "express";
import "express-async-errors";
import authMiddleware from "../middlewares/auth.middleware.js";
import recentActivityController from "../controllers/recentActivity/recentActivity.controller.js";

const router = express.Router();

router.get("/recent/activities", authMiddleware(), recentActivityController.getRecentActivities);
router.post("/recent/activity/moneyLent", authMiddleware(), recentActivityController.recordMoneyLentActivity);
router.post("/recent/activity", authMiddleware(), recentActivityController.createActivity);

export default router;
