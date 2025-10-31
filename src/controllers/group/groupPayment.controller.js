import groupPaymentModel from "../../models/groupPayment.model.js";
import groupModel from "../../models/group.model.js";
import { StatusCodes } from "http-status-codes";
import expenseController from "./expense.controller.js";
import recentActivityController from "../recentActivity/recentActivity.controller.js";

async function addGroupPayment(req, res) {
    const { groupId } = req.params;

    const group = await groupModel.findById(groupId).lean();
    group.members = group.members.map(id => id.toString());
    if (!group) {
        return res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: "Group not found",
        });
    }

    if (!group.members.includes(req.body.paid_by)) {
        return res.status(StatusCodes.FORBIDDEN).json({
            success: false,
            message: "Payer is not a member of this group",
        });
    }

    if (!group.members.includes(req.body.paid_to)) {
        return res.status(StatusCodes.FORBIDDEN).json({
            success: false,
            message: "Payee is not a member of this group",
        });
    }
    
    await new groupPaymentModel({
        ...req.body,
        group: groupId,
    }).save();

    await expenseController.calculateGroupBalances(groupId);

    await recentActivityController.addToRecentActivities({
        group: groupId,
        user: req.user?._id,
        activityType: "SETTLE_PAYMENT",
        otherUser: req.body.paid_to,
        amount: req.body.amount,
    });

    return res.status(StatusCodes.OK).json({
        success: true,
        message: "Group payment added successfully",
    });
};


async function getGroupGroupPayments(req, res) {
    const { groupId } = req.params;

    const group = await groupModel.findById(groupId).lean();
    group.members = group.members.map(id => id.toString());

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
        filter["$or"] = [
            { paid_by: req.query?.userId },
            { paid_to: req.query?.userId }
        ]
    }
    const groupPayments = await groupPaymentModel.find(filter).lean();

    return res.status(StatusCodes.OK).json({
        success: true,
        message: "GroupPayments fetched successfully",
        data: groupPayments
    });
};

export default {
    addGroupPayment,
    getGroupGroupPayments,
}
