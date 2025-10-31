import expenseModel from "../../models/expense.model.js";
import groupModel from "../../models/group.model.js";
import { StatusCodes } from "http-status-codes";
import { calculateGroupBalance } from "../../utils/group.utils.js";
import groupPaymentModel from "../../models/groupPayment.model.js";
import recentActivityController from "../recentActivity/recentActivity.controller.js";

async function addExpense(req, res) {
    const { groupId } = req.params;
    const { paid_by, split_between } = req.body;

    const group = await groupModel.findById(groupId).lean();
    group.members = group.members.map(id => id.toString());
    group.member_admins = group.member_admins.map(id => id.toString());
    group.created_by = group.created_by.toString();
    if (!group) {
        return res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: "Group not found"
        });
    }
    if (!group.members.includes(req.user._id.toString())) {
        return res.status(StatusCodes.FORBIDDEN).json({
            success: false,
            message: "You are not a member of this group"
        });
    }
    if (!group.members.includes(paid_by)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: "Payer must be a member of the group"
        });
    }
    for (let userId of split_between) {
        if (!group.members.includes(userId)) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "All users in split_between must be members of the group"
            });
        }
    }
    if (!split_between.includes(paid_by)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: "Payer must be included in split_between"
        });
    }

    const expense = await new expenseModel({
        ...req.body,
        group: groupId,
    }).save();
    console.log("Expense added:", expense);
    await calculateGroupBalances(groupId);

    await recentActivityController.addToRecentActivities({
        group: groupId,
        user: paid_by,
        activityType: "ADD_EXPENSE",
        amount: expense.amount,
    });

    return res.status(StatusCodes.OK).json({
        success: true,
        message: "Expense added successfully",
        data: expense
    });
};

async function updateExpense(req, res) {
    const { groupId, expenseId } = req.params;

    const group = await groupModel.findById(groupId).lean();
    group.members = group.members.map(id => id.toString());
    group.member_admins = group.member_admins.map(id => id.toString());
    group.created_by = group.created_by.toString();

    if (!group) {
        return res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: "Group not found"
        });
    }
    if (!group.members.includes(req.user._id.toString())) {
        return res.status(StatusCodes.FORBIDDEN).json({
            success: false,
            message: "You are not a member of this group"
        });
    }
    const expense = await expenseModel.findOne({
        _id: expenseId,
        group: groupId,
    });
    if (!expense) {
        return res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: "Expense not found"
        });
    }
    if (req.body.paid_by && !group.members.includes(req.body.paid_by)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: "Payer must be a member of the group"
        });
    }
    if (req.body.split_between) {
        for (let userId of req.body.split_between) {
            if (!group.members.includes(userId)) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: "All users in split_between must be members of the group"
                });
            }
        }
        if (req.body.paid_by && !req.body.split_between.includes(req.body.paid_by)) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Payer must be included in split_between"
            });
        } else if (!req.body.paid_by && !req.body.split_between.includes(expense.paid_by.toString())) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Payer must be included in split_between"
            });
        }
    }

    const updated = await expenseModel.findByIdAndUpdate(expenseId, req.body, { new: true });

    await calculateGroupBalances(groupId);

    await recentActivityController.addToRecentActivities({
        group: groupId,
        user: req.user?._id,
        activityType: "UPDATE_EXPENSE",
        amount: updated.amount,
    });

    return res.status(StatusCodes.OK).json({
        success: true,
        message: "Expense updated successfully",
        data: updated
    });
};

async function deleteExpense(req, res) {
    const { groupId, expenseId } = req.params;

    const group = await groupModel.findById(groupId).lean();
    group.members = group.members.map(id => id.toString());
    group.member_admins = group.member_admins.map(id => id.toString());
    group.created_by = group.created_by.toString();

    if (!group) {
        return res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: "Group not found"
        });
    }
    if (!group.members.includes(req.user._id.toString())) {
        return res.status(StatusCodes.FORBIDDEN).json({
            success: false,
            message: "You are not a member of this group"
        });
    }
    const expense = await expenseModel.findOne({
        _id: expenseId,
        group: groupId,
    });
    if (!expense) {
        return res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: "Expense not found"
        });
    }

    const deleted = await expenseModel.findByIdAndDelete(expenseId);

    await calculateGroupBalances(groupId);

    await recentActivityController.addToRecentActivities({
        group: groupId,
        user: req.user?._id,
        activityType: "DELETE_EXPENSE",
        amount: deleted.amount,
    });

    return res.status(StatusCodes.OK).json({
        success: true,
        message: "Expense deleted successfully",
        data: deleted
    });
};

async function getGroupExpenses(req, res) {
    const { groupId } = req.params;

    const group = await groupModel.findById(groupId).lean();
    group.members = group.members.map(id => id.toString());
    group.member_admins = group.member_admins.map(id => id.toString());
    group.created_by = group.created_by.toString();

    if (!group) {
        return res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: "Group not found"
        });
    }
    if (!group.members.includes(req.user?._id?.toString())) {
        return res.status(StatusCodes.FORBIDDEN).json({
            success: false,
            message: "You are not a member of this group"
        });
    }

    let filter = { group: groupId };
    if (req.query.userId) {
        filter = {
            group: groupId,
            $or: [
                { paid_by: req.query.userId },
                { split_between: req.query.userId },
            ]
        };
    }
    const expenses = await expenseModel.find(filter).lean();

    return res.status(StatusCodes.OK).json({
        success: true,
        message: "Expenses fetched successfully",
        data: expenses
    });
};

async function calculateGroupBalances(groupId, dontSettleYet=false) {
    const group = await groupModel.findOne({
        _id: groupId,
    }).populate("members").lean();

    if (!group) {
        throw new Error("Group not found or you are not a member of this group");
    }

    const groupExpenses = await expenseModel.find({
        group: group?._id,
    }).lean();
    const groupPayments = await groupPaymentModel.find({
        group: group._id
    });

    group.expenses = groupExpenses;

    let balances = {};
    for (let member of group.members) {
        const memberBalances = calculateGroupBalance(group, member._id.toString());
        balances[member._id] = memberBalances;
    }

    groupPayments.forEach(payment => {
        const paidBy = payment.paid_by.toString();
        const paidTo = payment.paid_to.toString();
        const amount = payment.amount;

        // In the paid by's balance
        if (balances[paidBy]) {
            if (!balances[paidBy][paidTo]) {
                balances[paidBy][paidTo] = 0;
            }
            balances[paidBy][paidTo] += amount;
        } else {
            balances[paidBy] = { [paidTo]: amount };
        }

        if (balances[paidTo] && balances[paidTo][paidBy]) {
            balances[paidTo][paidBy] -= amount;
        }
    });

    if (dontSettleYet) {
        await groupModel.findByIdAndUpdate(group._id?.toString(), {
            balances,
        });
        return;
    }
    const allSettled = Object.values(balances).every(userBalances => {
        return Object.values(userBalances).every(balance => balance === 0);
    });

    await groupModel.findByIdAndUpdate(group._id?.toString(), {
        balances,
        settled: allSettled || false,
    })
}


export default {
    addExpense,
    updateExpense,
    deleteExpense,
    getGroupExpenses,
    calculateGroupBalances,
};

