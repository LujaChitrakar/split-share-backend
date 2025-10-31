import { StatusCodes } from "http-status-codes";
import borrowRequestModel from "../../models/borrowRequest.model.js";
import { BORROW_REQUEST_STATUS } from "../../constants/user.constants.js";
import userModel from "../../models/user.model.js";
import recentActivityController from "../recentActivity/recentActivity.controller.js";

async function sendBorrowRequest(req, res) {
    const { userEmail } = req.body;
    if (req.user.email?.toString() === userEmail) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: "Cannot send borrow request to yourself."
        })
    }
    const userToSendRequest = await userModel.findOne({ email: userEmail });
    const userId = userToSendRequest?._id;

    if (!userToSendRequest) {
        return res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: "Target user not found",
        });
    }

    await new borrowRequestModel({
        requestor: req.user._id,
        requested_to: userId,
        status: BORROW_REQUEST_STATUS.PENDING,
        amount: req.body?.amount,
        reason: req.body?.reason,
    }).save();

    await recentActivityController.addToRecentActivities({
        user: req.user._id,
        otherUser: userId,
        activityType: "SEND_BORROW_REQUEST",
        amount: req.body?.amount,
    });

    return res.status(StatusCodes.OK).json({
        success: true,
        message: "Borrow request sent successfully",
    });
}

async function acceptBorrowRequest(req, res) {
    const { requestId, transactionId } = req.body;
    const borrowRequest = await borrowRequestModel.findById(requestId);
    if (!borrowRequest) {
        return res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: "Borrow request not found",
        });
    }
    if (borrowRequest.requested_to?.toString() !== req.user?._id?.toString()) {
        return res.status(StatusCodes.FORBIDDEN).json({
            success: false,
            message: "You are not authorized to accept this borrow request",
        });
    }
    if (borrowRequest.status !== BORROW_REQUEST_STATUS.PENDING) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: "This borrow request is not pending",
        });
    }

    const updatedRequest = await borrowRequestModel.findByIdAndUpdate(requestId, {
        status: BORROW_REQUEST_STATUS.ACCEPTED,
        transactionId,
    }, { new: true });

    await recentActivityController.addToRecentActivities({
        user: req.user._id,
        otherUser: borrowRequest.requestor,
        activityType: "ACCEPTED_BORROW_REQUEST",
        transactionId
    });

    return res.status(StatusCodes.OK).json({
        success: true,
        message: "Borrow request accepted successfully",
        data: updatedRequest,
    });
}

async function rejectBorrowRequest(req, res) {
    const { requestId } = req.body;
    const borrowRequest = await borrowRequestModel.findById(requestId);
    if (!borrowRequest) {
        return res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: "Borrow request not found",
        });
    }
    if (borrowRequest.requested_to?.toString() !== req.user?._id?.toString()) {
        return res.status(StatusCodes.FORBIDDEN).json({
            success: false,
            message: "You are not authorized to reject this borrow request",
        });
    }
    if (borrowRequest.status !== BORROW_REQUEST_STATUS.PENDING) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: "This borrow request is not pending",
        });
    }
    await borrowRequestModel.findByIdAndUpdate(requestId, {
        status: BORROW_REQUEST_STATUS.REJECTED,
    });

    await recentActivityController.addToRecentActivities({
        user: req.user._id,
        otherUser: borrowRequest.requestor,
        activityType: "REJECTED_BORROW_REQUEST",
    });

    return res.status(StatusCodes.OK).json({
        success: true,
        message: "Borrow request rejected successfully",
    });
}

async function getMySentBorrowRequests(req, res, next) {
    const userId = req.user._id;

    let filter = {
        requestor: userId,
    };
    if (req.query.status) {
        filter.status = req.query.status;
    }
    if (req.query.requested_to) {
        filter.requested_to = req.query.requested_to;
    }

    const totalRequests = await borrowRequestModel.countDocuments(filter);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const borrowRequests = await borrowRequestModel.find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .populate("requestor")
        .populate("requested_to");

    return res.status(StatusCodes.OK).json({
        success: true,
        data: borrowRequests,
        message: "Borrow requests fetched successfully",
        pagination: {
            totalCount: totalRequests,
            totalPages: Math.ceil(totalRequests / limit),
            currentPage: page,
            limit,
        }
    });
}

async function getBorrowRequestToMe(req, res, next) {
    const userId = req.user._id;

    let filter = {
        requested_to: userId,
    };
    if (req.query.status) {
        filter.status = req.query.status;
    }
    if (req.query.requestor) {
        filter.requestor = req.query.requestor;
    }

    const totalRequests = await borrowRequestModel.countDocuments(filter);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const borrowRequests = await borrowRequestModel.find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .populate("requestor")
        .populate("requested_to");

    return res.status(StatusCodes.OK).json({
        success: true,
        data: borrowRequests,
        message: "Borrow requests fetched successfully",
        pagination: {
            totalCount: totalRequests,
            totalPages: Math.ceil(totalRequests / limit),
            currentPage: page,
            limit,
        }
    });
}

export default {
    sendBorrowRequest,
    acceptBorrowRequest,
    rejectBorrowRequest,

    getMySentBorrowRequests,
    getBorrowRequestToMe,
};
