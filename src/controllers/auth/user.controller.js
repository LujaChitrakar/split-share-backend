import userModel from "../../models/user.model.js";
import { StatusCodes } from "http-status-codes";
import groupModel from "../../models/group.model.js";

async function checkUsernameAavailability(req, res) {
    const { username } = req.body;
    const usernameCount = await userModel.countDocuments({ username });
    return res.status(StatusCodes.OK).json({
        success: true,
        message: "Username availability checked successfully",
        data: { available: usernameCount === 0 },
    });
}

async function checkEmailAvailability(req, res) {
    const { email } = req.body;
    const emailCount = await userModel.countDocuments({ email });
    return res.status(StatusCodes.OK).json({
        success: true,
        message: "Email availability checked successfully",
        data: { available: emailCount === 0 },
    });
}

async function getProfile(req, res) {
    const userId = req.user?._id?.toString();
    const activeGroups = await groupModel.find({
        members: userId,
        settled: false,
    }).select("balances");


    let totalOwedByUser = 0;
    let totalOwededToUser = 0;
    activeGroups.forEach(group => {
        if (group.balances && group.balances[userId]) {
            Object.values(group.balances[userId]).map(amount => {
                if (amount < 0) {
                    totalOwedByUser += Math.abs(amount);
                } else {
                    totalOwededToUser += Math.abs(amount);
                }
            })
        }
    });

    return res.status(StatusCodes.OK).json({
        success: true,
        message: "Profile data fetched",
        data: {
            totalOwedByUser,
            totalOwededToUser,
            ...req.user
        }
    });
}

async function updateProfile(req, res) {

    const updatedUser = await userModel.findByIdAndUpdate(req.user?._id, req.body, { new: true }).lean();
    if (!updatedUser) {
        return res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: "User not found",
        });
    }

    return res.status(StatusCodes.OK).json({
        success: true,
        message: "Profile updated successfully",
        data: updatedUser,
    });

}

async function getUserById(req, res) {
    const friendId = req.params?.friendId?.toString();
    const userId = req.user?._id?.toString();
    let friendDetails = await userModel.findOne({ email: friendId }).lean();
    if (!friendDetails && friendId.match(/^[0-9a-fA-F]{24}$/)) {
        friendDetails = await userModel.findById(friendId).lean();
    }
    if (!friendDetails) {
        friendDetails = await userModel.findOne({ wallet_public_key: friendId }).lean();
    }

    if (!friendDetails) {
        return res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: "User not found",
        });
    }

    if (req.query?.lookupOnly) {
        return res.status(StatusCodes.OK).json({
            success: true,
            message: "User lookup successfull.",
            data: friendDetails,
        })
    }

    const activeGroups = await groupModel.find({
        members: { $all: [userId, friendDetails?._id?.toString()] },
        settled: false,
    }).select("balances");


    let totalOwedByUser = 0;
    let totalOwedToUser = 0;
    activeGroups.forEach(group => {
        if (group.balances && group.balances[userId]) {
            if (group.balances[userId][friendId]) {
                const amount = group.balances[userId][friendId];
                if (amount < 0) {
                    totalOwedByUser += Math.abs(amount);
                } else {
                    totalOwedToUser += Math.abs(amount);
                }
            }
        }
    });

    return res.status(StatusCodes.OK).json({
        success: true,
        message: "Friend Details Fetched",
        data: {
            ...friendDetails,
            totalOwedByUser,
            totalOwedToUser,
        }
    })
}

async function getUserByWalletAddress(req, res) {
    const { wallet_public_key } = req.body;
    const user = await userModel.findOne({ wallet_public_key }).lean();
    if (!user) {
        return res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: "User not found",
        });
    }

    return res.status(StatusCodes.OK).json({
        success: true,
        message: "User fetched successfully",
        data: user,
    });
}


export default {
    checkUsernameAavailability,
    checkEmailAvailability,
    getProfile,
    updateProfile,
    getUserById,
    getUserByWalletAddress,
};