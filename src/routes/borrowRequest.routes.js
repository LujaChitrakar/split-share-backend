import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import validateZodSchema from "../middlewares/validation.middleware.js";
import { acceptRejectFriendRequestSchema } from "../validations/friends.validation.js";
import "express-async-errors";
import borrowRequestController from "../controllers/borrow/borrowRequest.controller.js";

const router = express.Router();

router.post("/borrow/request", authMiddleware(), borrowRequestController.sendBorrowRequest);
router.put("/borrow/accept-request", authMiddleware(), validateZodSchema(acceptRejectFriendRequestSchema), borrowRequestController.acceptBorrowRequest);
router.put("/borrow/reject-request", authMiddleware(), validateZodSchema(acceptRejectFriendRequestSchema), borrowRequestController.rejectBorrowRequest);

router.get("/borrow/my-sent-requests", authMiddleware(), borrowRequestController.getMySentBorrowRequests);
router.get("/borrow/requests-to-me", authMiddleware(), borrowRequestController.getBorrowRequestToMe);

export default router;