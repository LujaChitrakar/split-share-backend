import express from "express";
import friendsController from "../controllers/friends/friends.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import validateZodSchema from "../middlewares/validation.middleware.js";
import { acceptRejectFriendRequestSchema, removeFriendSchema, sendFriendRequestSchema } from "../validations/friends.validation.js";
import "express-async-errors";

const router = express.Router();

router.post("/friend/request", authMiddleware(), validateZodSchema(sendFriendRequestSchema), friendsController.sendFriendRequest);
router.put("/friend/accept-request", authMiddleware(), validateZodSchema(acceptRejectFriendRequestSchema), friendsController.acceptFriendRequest);
router.put("/friend/reject-request", authMiddleware(), validateZodSchema(acceptRejectFriendRequestSchema), friendsController.rejectFriendRequest);
router.get("/friend/my-friend-requests", authMiddleware(), friendsController.getMyFriendRequests);
router.get("/friend/my-friends", authMiddleware(), friendsController.getMyFriends);
router.delete("/friend/remove-friend", authMiddleware(), validateZodSchema(removeFriendSchema), friendsController.removeFriend);

export default router;