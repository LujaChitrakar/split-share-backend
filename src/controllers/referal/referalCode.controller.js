import userModel from "../../models/user.model.js";
import { StatusCodes } from "http-status-codes";
import referalCodeModel from "../../models/userReferealCode.model.js";
import { generateAlphanumericCode } from "../../utils/group.utils.js";
import pointModel from "../../models/point.model.js";
import recentActivityController from "../recentActivity/recentActivity.controller.js";
import friendshipModel from "../../models/friendship.model.js";
import { REDEEM_USDC_VALUE, REDEEMABLE_POINTS_THRESHOLD } from "../../constants/user.constants.js";
import transactionController from "../transaction.controller.js";

const recalculateUserPoints = async (userId) => {
    const totalPoints = await pointModel.aggregate([
        { $match: { user: userId } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const points = totalPoints[0]?.total || 0;

    await userModel.findByIdAndUpdate(userId, {
        points,
    });
}


const getMyCurrentReferalCode = async (req, res) => {
    const userId = req.user._id;

    let current = await referalCodeModel.findOne({
        owner: userId,
    }).sort({ createdAt: -1 }).lean();

    if (!current || current.usedCount >= current.maxUseCount) {
        const newCode = generateAlphanumericCode(8);
        while (await referalCodeModel.countDocuments({
            code: newCode,
        })) {
            newCode = generateAlphanumericCode(8);
        }

        current = await new referalCodeModel({
            owner: userId,
            code: newCode,
            maxUseCount: 10,
        }).save();

    }

    return res.status(StatusCodes.OK).json({
        success: true,
        message: "Current referal code fetched successfully",
        data: current,
    });
}


const applyReferalCode = async (req, res) => {
    const { code } = req.body;

    if (code === "NOT_REFERRED") {
        await userModel.findByIdAndUpdate(req.user?._id, {
            onboarding_completed: true
        });
        return res.status(StatusCodes.OK).json({
            success: true,
            message: "Onboarding completed, no referal code."
        });
    }

    const referalCode = await referalCodeModel.findOne({
        code,
    });
    if (!referalCode || referalCode.usedCount >= referalCode.maxUseCount) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: "Invalid or expired referal code",
        });
    }

    const userId = req.user._id;

    if (referalCode.owner.toString() === userId.toString()) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: "You cannot use your own referal code",
        });
    }

    if (req.user?.onboarding_completed) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: "Referal code can only be applied during onboarding",
        });
    }

    await Promise.all([
        referalCodeModel.findByIdAndUpdate(referalCode._id, {
            $inc: { usedCount: 1 },
            $push: { usedBy: userId },
        }),
        userModel.findByIdAndUpdate(userId, {
            onboarding_completed: true,
        }),
        new pointModel({
            user: referalCode.owner,
            amount: 100,
            rewardType: "REFERAL",
            message: `Reward for referring user ${req.user?.email}`,
        }).save(),
        new pointModel({
            user: userId,
            amount: 50,
            rewardType: "REFERAL",
            message: `Reward for using referal code ${code}`,
        }).save(),
        recentActivityController.addToRecentActivities({
            user: userId,
            activityType: "APPLIED_REFERAL_CODE",
            otherUser: referalCode.owner,
            amount: 50,
        }),
        recentActivityController.addToRecentActivities({
            user: referalCode.owner,
            activityType: "REFERRED_USER",
            otherUser: userId,
            amount: 100,
        }),
    ]);

    const friendShip = await friendshipModel.findOne({
        $or: [
            { user_one: referalCode.owner, user_two: userId },
            { user_one: userId, user_two: referalCode.owner },
        ],
        status: "ACCEPTED",
    });
    if (!friendShip) {
        await new friendshipModel({
            user_one: referalCode.owner,
            user_two: userId,
            status: "ACCEPTED",
        }).save();
    }


    await Promise.all([
        recalculateUserPoints(referalCode.owner),
        recalculateUserPoints(userId),
    ])

    return res.status(StatusCodes.OK).json({
        success: true,
        message: "Referal code applied successfully",
    });
}

const redeemPointsCashback = async (req, res, next) => {

    const totalPoints = req.user.points || 0;
    const totalRedeemedPoints = req.user?.totalRedeemedPoints || 0;

    const redeemablePoints = totalPoints - totalRedeemedPoints;

    if (redeemablePoints < REDEEMABLE_POINTS_THRESHOLD) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: `Not enough points to redeem cashback. Minimum ${REDEEMABLE_POINTS_THRESHOLD} points required.`,
        });
    }

    const sendResponse = await transactionController.sendUsdc({
        recipientAddress: req.user.wallet_public_key,
        amount: REDEEM_USDC_VALUE,
    });

    if (!sendResponse.success) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Failed to send USDC cashback.",
        });
    }

    await userModel.findByIdAndUpdate(req.user._id, {
        totalRedeemedPoints: totalRedeemedPoints + Math.min(redeemablePoints, REDEEMABLE_POINTS_THRESHOLD),
    });

    await recentActivityController.addToRecentActivities({
        user: req.user._id,
        activityType: "REDEEMED_CASHBACK",
        amount: REDEEM_USDC_VALUE,
        transactionId: sendResponse.data.transactionHash,
    });

    return res.status(StatusCodes.OK).json({
        success: true,
        message: `Successfully redeemed ${redeemablePoints} points for $${REDEEM_USDC_VALUE} cashback.`,
    });
};

export default {
    getMyCurrentReferalCode,
    applyReferalCode,
    redeemPointsCashback,
}

