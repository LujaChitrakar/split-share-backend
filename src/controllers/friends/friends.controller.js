import { StatusCodes } from "http-status-codes";
import friendshipModel from "../../models/friendship.model.js";
import { FRIEND_REQUEST_STATUS } from "../../constants/user.constants.js";
import userModel from "../../models/user.model.js";
import expenseModel from "../../models/expense.model.js";
import recentActivityController from "../recentActivity/recentActivity.controller.js";
import { sendNotification } from "../../utils/notification.util.js";

// async function sendFriendRequest(req, res) {
//     const { userEmail } = req.body;
//     if (req.user.email?.toString() === userEmail) {
//         return res.status(StatusCodes.BAD_REQUEST).json({
//             success: false,
//             message: "Cannot send friend request to yourself."
//         })
//     }
//     const userToSendRequest = await userModel.findOne({ email: userEmail });
//     const userId = userToSendRequest?._id;

//     if (!userToSendRequest) {
//         return res.status(StatusCodes.NOT_FOUND).json({
//             success: false,
//             message: "Target user not found",
//         });
//     }
//     const alreadyRequested = await friendshipModel.findOne({
//         $or: [
//             { user_one: req.user._id, user_two: userId },
//             { user_one: userId, user_two: req.user._id },
//         ],
//     });
//     if (alreadyRequested?.status === FRIEND_REQUEST_STATUS.ACCEPTED) {
//         return res.status(StatusCodes.BAD_REQUEST).json({
//             success: false,
//             message: "You are already friends with this user",
//         });
//     }
//     if (alreadyRequested?.status === FRIEND_REQUEST_STATUS.PENDING) {
//         if (alreadyRequested.user_one?.toString() === req.user?._id?.toString()) {
//             return res.status(StatusCodes.BAD_REQUEST).json({
//                 success: false,
//                 message: "Friend request already sent to this user",
//             });
//         } else {
//             return res.status(StatusCodes.BAD_REQUEST).json({
//                 success: false,
//                 message: "This user has already sent you a friend request. Please accept it.",
//             });
//         }
//     }
//     await new friendshipModel({
//         user_one: req.user._id,
//         user_two: userId,
//         status: FRIEND_REQUEST_STATUS.PENDING,
//     }).save();

//     await recentActivityController.addToRecentActivities({
//         user: req.user._id,
//         otherUser: userId,
//         activityType: "SEND_FRIEND_REQUEST",
//     });

//     return res.status(StatusCodes.OK).json({
//         success: true,
//         message: "Friend request sent successfully",
//     });
// }

async function sendFriendRequest(req, res) {
    const { userEmail } = req.body;
    if (req.user.email?.toString() === userEmail) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: "Cannot send friend request to yourself."
        })
    }
    const userToSendRequest = await userModel.findOne({ email: userEmail });
    const userId = userToSendRequest?._id;
    const token = userToSendRequest?.notification_token

    if (!userToSendRequest) {
        return res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: "Target user not found",
        });
    }

    let title = "Friend Request"
    let body = "Someone is interested in you, tap here to see the request"
    let metadata = {}

    await sendNotification({ token, title, body, metadata });
    const alreadyRequested = await friendshipModel.findOne({
        $or: [
            { user_one: req.user._id, user_two: userId },
            { user_one: userId, user_two: req.user._id },
        ],
    });
    if (alreadyRequested?.status === FRIEND_REQUEST_STATUS.ACCEPTED) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: "You are already friends with this user",
        });
    }
    if (alreadyRequested?.status === FRIEND_REQUEST_STATUS.PENDING) {
        if (alreadyRequested.user_one?.toString() === req.user?._id?.toString()) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Friend request already sent to this user",
            });
        } else {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "This user has already sent you a friend request. Please accept it.",
            });
        }
    }
    await new friendshipModel({
        user_one: req.user._id,
        user_two: userId,
        status: FRIEND_REQUEST_STATUS.PENDING,
    }).save();

    await recentActivityController.addToRecentActivities({
        user: req.user._id,
        otherUser: userId,
        activityType: "SEND_FRIEND_REQUEST",
    });



    return res.status(StatusCodes.OK).json({
        success: true,
        message: "Friend request sent successfully",
    });
}

async function acceptFriendRequest(req, res) {
    const { requestId } = req.body;
    const friendRequest = await friendshipModel.findById(requestId);
    if (!friendRequest) {
        return res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: "Friend request not found",
        });
    }
    if (friendRequest.user_two?.toString() !== req.user?._id?.toString()) {
        return res.status(StatusCodes.FORBIDDEN).json({
            success: false,
            message: "You are not authorized to accept this friend request",
        });
    }
    if (friendRequest.status !== FRIEND_REQUEST_STATUS.PENDING) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: "This friend request is not pending",
        });
    }
    const updatedRequest = await friendshipModel.findByIdAndUpdate(requestId, {
        status: FRIEND_REQUEST_STATUS.ACCEPTED,
    }, { new: true });

    await recentActivityController.addToRecentActivities({
        user: req.user._id,
        otherUser: friendRequest.user_one,
        activityType: "ACCEPT_FRIEND_REQUEST",
    });

    return res.status(StatusCodes.OK).json({
        success: true,
        message: "Friend request accepted successfully",
        data: updatedRequest,
    });
}

async function rejectFriendRequest(req, res) {
    const { requestId } = req.body;
    const friendRequest = await friendshipModel.findById(requestId);
    if (!friendRequest) {
        return res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: "Friend request not found",
        });
    }
    if (friendRequest.user_two?.toString() !== req.user?._id?.toString()) {
        return res.status(StatusCodes.FORBIDDEN).json({
            success: false,
            message: "You are not authorized to reject this friend request",
        });
    }
    if (friendRequest.status !== FRIEND_REQUEST_STATUS.PENDING) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: "This friend request is not pending",
        });
    }
    await friendshipModel.findByIdAndUpdate(requestId, {
        status: FRIEND_REQUEST_STATUS.REJECTED,
    });

    await recentActivityController.addToRecentActivities({
        user: req.user._id,
        otherUser: friendRequest.user_one,
        activityType: "REJECT_FRIEND_REQUEST",
    });

    return res.status(StatusCodes.OK).json({
        success: true,
        message: "Friend request rejected successfully",
    });
}

async function getMyFriends(req, res) {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let filter = {
        $or: [
            { user_one: userId },
            { user_two: userId },
        ],
        status: FRIEND_REQUEST_STATUS.ACCEPTED,
    };

    if (req.query?.q) {
        // Find users matching the query by email or username
        const users = await userModel.find({
            $or: [
                { email: { $regex: req.query.q, $options: "i" } },
                { username: { $regex: req.query.q, $options: "i" } }
            ]
        })
            .skip(skip)
            .limit(limit)
            .select("_id").lean();

        const userIds = users.map(u => u._id?.toString());

        // Filter friendships where the friend matches the query
        filter.$or = [
            { user_one: userId, user_two: { $in: userIds } },
            { user_two: userId, user_one: { $in: userIds } }
        ];
    }

    const friends = await friendshipModel.find(filter)
        .skip(skip)
        .limit(limit)
        .populate("user_one user_two")
        .lean();

    const totalFriends = await friendshipModel.countDocuments(filter);
    const totalPages = Math.ceil(totalFriends / limit);

    const formattedFriends = await Promise.all(friends.map(async (friendship) => {
        const friend = friendship.user_one._id.toString() === userId.toString()
            ? friendship.user_two
            : friendship.user_one;

        const expensesWithFriend = await expenseModel.find({
            settled: false,
            split_between: { $all: [userId, friend._id] },
            paid_by: { $in: [userId, friend._id] },
        }).lean();

        let toBePaid = 0;
        let toBeReceived = 0;

        expensesWithFriend.forEach(expense => {
            const splitAmount = expense.amount / expense.split_between.length;
            if (expense.paid_by.toString() === userId.toString()) {
                toBeReceived += splitAmount;
            } else if (expense.paid_by.toString() === friend._id.toString()) {
                toBePaid += splitAmount;
            }
        });

        friend.toBePaid = toBePaid;
        friend.toBeReceived = toBeReceived;

        return friend;
    }));

    return res.status(StatusCodes.OK).json({
        success: true,
        message: "Friends fetched successfully",
        data: formattedFriends,
        pagination: {
            totalCount: totalFriends,
            totalPages,
            currentPage: page,
            limit,
        }
    });
}

async function removeFriend(req, res) {
    const { friendId } = req.body;
    const userId = req.user._id;
    const friendship = await friendshipModel.findOne({
        $or: [
            { user_one: userId, user_two: friendId, status: FRIEND_REQUEST_STATUS.ACCEPTED },
            { user_one: friendId, user_two: userId, status: FRIEND_REQUEST_STATUS.ACCEPTED },
        ],
    });
    if (!friendship) {
        return res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: "Friendship not found",
        });
    }
    await friendshipModel.findByIdAndDelete(friendship._id);

    await recentActivityController.addToRecentActivities({
        user: userId,
        otherUser: friendId,
        activityType: "REMOVED_FRIEND",
    });

    return res.status(StatusCodes.OK).json({
        success: true,
        message: "Friend removed successfully",
    });
}

async function getMyFriendRequests(req, res) {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const friendRequests = await friendshipModel.find({
        user_two: userId,
        status: FRIEND_REQUEST_STATUS.PENDING,
    }).skip(skip).limit(limit).populate("user_one").lean();

    return res.status(StatusCodes.OK).json({
        success: true,
        message: "Friend requests fetched successfully",
        data: friendRequests,
    });
}

export default {
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    getMyFriendRequests,
    getMyFriends,
    removeFriend,
};
