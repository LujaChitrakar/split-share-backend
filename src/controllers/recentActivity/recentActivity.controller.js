import recentActivityModel from "../../models/recentActivity.model.js";
import { StatusCodes } from "http-status-codes";

async function getRecentActivities(req, res) {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {
        user: req.user._id,
    };
    if (req.query?.friendId) {
        filter.otherUser = req.query?.friendId;
    }
    if (req.query.activityType) {
        filter.activityType = req.query.activityType;
    }

    const totalActivities = await recentActivityModel.countDocuments(filter);
    const activities = await recentActivityModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user")
        .populate("otherUser")
        .populate("group");

    return res.status(StatusCodes.OK).json({
        success: true,
        data: activities,
        pagination: {
            currentPage: page,
            limit,
            totalCount: totalActivities,
            totalPages: Math.ceil(totalActivities / limit),
        }
    });
};

async function addToRecentActivities(data) {
    return await recentActivityModel.create(data);
}

async function createActivity(req, res) {
    const activityData = req.body;
    const newActivity = await new recentActivityModel(activityData).save();
    return res.status(StatusCodes.CREATED).json({
        success: true,
        data: newActivity,
    });
}

async function recordMoneyLentActivity(req, res, next) {
    const {
        lenderId,
        borrowerId,
        amount,
        transactionId,
        lender_wallet_address,
        borrower_wallet_address,
        activityType,
        purpose,
    } = req.body;

    await Promise.all([
        addToRecentActivities({
            user: lenderId,
            otherUser: borrowerId,
            amount,
            transactionId,
            sender_wallet_address: lender_wallet_address,
            receiver_wallet_address: borrower_wallet_address,
            activityType: activityType || "LENT_MONEY",
            purpose,
        }),
        borrowerId ?
            addToRecentActivities({
                user: borrowerId,
                otherUser: lenderId,
                amount,
                transactionId,
                sender_wallet_address: lender_wallet_address,
                receiver_wallet_address: borrower_wallet_address,
                activityType: "BORROWED_MONEY",
                purpose
            }) : null
    ])

    return res.status(StatusCodes.OK).json({
        success: true,
        message: "Activity registered successfully"
    })
}

export default {
    getRecentActivities,
    addToRecentActivities,
    createActivity,
    recordMoneyLentActivity,
}

