import express from "express";
import "express-async-errors";
import authMiddleware from "../middlewares/auth.middleware.js";
import savingGroupController from "../controllers/saving/savingGroup.controller.js";
import savingGroupTransactionController from "../controllers/saving/savingGroupTransaction.controller.js";

const router = express.Router();

// Saving transactions
router.post("/saving/transaction", authMiddleware(), savingGroupTransactionController.addSavingGroupTransaction);

// Saving group crud
router.post("/saving", authMiddleware(), savingGroupController.createSavingGroup);
router.get("/saving/my-groups", authMiddleware(), savingGroupController.getMySavingGroups);
router.get("/saving/:id", authMiddleware(), savingGroupController.getSavingGroupById);
router.put("/saving/:id", authMiddleware(), savingGroupController.updateSavingGroup);
router.delete("/saving/:id", authMiddleware(), savingGroupController.deleteSavingGroup);
router.post("/saving/:groupCode/join", authMiddleware(), savingGroupController.joinSavingGroup);
router.get("/saving/:groupCode/find", authMiddleware(), savingGroupController.searchSavingGroupBySavingGroupCode);


export default router;
