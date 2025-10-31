import express from "express";
import groupController from "../controllers/group/group.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import validateZodSchema from "../middlewares/validation.middleware.js";
import { createGroupSchema, updateGroupSchema } from "../validations/group.validation.js";
import { addExpenseSchema, updateExpenseSchema } from "../validations/expense.validation.js";
import expenseController from "../controllers/group/expense.controller.js";
import groupPaymentController from "../controllers/group/groupPayment.controller.js";
import "express-async-errors";

const router = express.Router();

router.post("/group", authMiddleware(), validateZodSchema(createGroupSchema), groupController.createGroup);
router.get("/group/my-groups", authMiddleware(), groupController.getMyGroups);
router.get("/group/:id", authMiddleware(), groupController.getGroupById);
router.put("/group/:id", authMiddleware(), validateZodSchema(updateGroupSchema), groupController.updateGroup);
router.delete("/group/:id", authMiddleware(), groupController.deleteGroup);
router.post("/group/:groupCode/join", authMiddleware(), groupController.joinGroup);
router.get("/group/:groupCode/find", authMiddleware(), groupController.searchGroupByGroupCode);

// Group Expense
router.post("/group/:groupId/expense", authMiddleware(), validateZodSchema(addExpenseSchema), expenseController.addExpense);
router.put("/group/:groupId/expense/:expenseId", authMiddleware(), validateZodSchema(updateExpenseSchema), expenseController.updateExpense);
router.delete("/group/:groupId/expense/:expenseId", authMiddleware(), expenseController.deleteExpense);
router.get("/group/:groupId/expense", authMiddleware(), expenseController.getGroupExpenses);
router.post("/group/:groupId/calculate-balances", authMiddleware(), expenseController.calculateGroupBalances);


// Group Payments
router.post("/group/:groupId/payment", authMiddleware(), groupPaymentController.addGroupPayment);
router.post("/group/:groupId/payment", authMiddleware(), groupPaymentController.getGroupGroupPayments);

export default router;
