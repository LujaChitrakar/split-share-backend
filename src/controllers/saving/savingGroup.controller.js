import savingGroupModel from "../../models/savingGroup.model.js";
import userModel from "../../models/user.model.js";
import { StatusCodes } from "http-status-codes";
import { generateAlphanumericCode } from "../../utils/group.utils.js";
import { FRIEND_REQUEST_STATUS } from "../../constants/user.constants.js";
import friendshipModel from "../../models/friendship.model.js";
import recentActivityController from "../recentActivity/recentActivity.controller.js";


async function createSavingGroup(req, res) {
    let member_emails = req.body.member_emails || [];
    member_emails = Array.from(new Set([req.user.email, ...member_emails]));

    const members = await userModel.find({ email: { $in: member_emails } }).select("_id email").lean();

    let member_ids = Array.from(new Set([req.user?._id.toString(), ...members.map(m => m?._id?.toString())]));
    member_emails = members?.map(m=>m.email);

    let randomSavingGroupCode = generateAlphanumericCode();
    while (await savingGroupModel.countDocuments({ groupCode: randomSavingGroupCode })) {
        randomSavingGroupCode = generateAlphanumericCode();
    }

    const newSavingGroup = await new savingGroupModel({
        groupCode: randomSavingGroupCode,
        member_admins: [req.user._id],
        members: member_ids,
        created_by: req?.user?._id,
        member_emails,
        ...req.body
    }).save();

    await makeSavingGroupMembersFriends(newSavingGroup);

    await recentActivityController.addToRecentActivities({
        savingGroup: newSavingGroup._id,
        user: req.user._id,
        activityType: "CREATE_GROUP",
    });

    return res.status(StatusCodes.OK).json({
        success: true,
        message: "SavingGroup created successfully",
        data: newSavingGroup
    });
}

async function makeSavingGroupMembersFriends(savingGroup) {
    const members = await savingGroupModel.findById(savingGroup._id).select("members").lean();
    const memberIds = members?.members.map(member => member.toString());

    let friendShips = await Promise.all(memberIds.map(async (memberId) => {
        const otherMemberIds = memberIds.filter(id => id !== memberId);
        return await Promise.all(otherMemberIds.map(async (otherMemberId) => {
            const isFriends = await friendshipModel.findOne({
                $or: [
                    { user_one: memberId, user_two: otherMemberId },
                    { user_one: otherMemberId, user_two: memberId },
                ],
                status: FRIEND_REQUEST_STATUS.ACCEPTED,
            }).lean();
            if (!isFriends) {
                return await new friendshipModel({
                    user_one: memberId,
                    user_two: otherMemberId,
                    status: FRIEND_REQUEST_STATUS.ACCEPTED,
                }).save();
            }
            return isFriends;
        }));
    }));
    return friendShips;
}

async function getMySavingGroups(req, res) {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    let filter = {
        members: req.user._id,
    };
    if (req.query?.q) {
        filter.name = { $regex: req.query.q, $options: 'i' };
    }


    const skip = (page - 1) * limit;
    const savingGroups = await savingGroupModel.find(filter).populate("members").sort({
        settled: 1,
    }).skip(skip).limit(limit).lean();
    const totalSavingGroups = await savingGroupModel.countDocuments(filter);
    const totalPages = Math.ceil(totalSavingGroups / limit);
    return res.status(StatusCodes.OK).json({
        success: true,
        message: "SavingGroups fetched successfully",
        data: savingGroups,
        pagination: {
            totalCount: totalSavingGroups,
            totalPages,
            currentPage: page,
            limit,
        }
    });
}

async function getSavingGroupById(req, res) {
    const { id: savingGroupId } = req.params;

    const savingGroup = await savingGroupModel.findOne({
        _id: savingGroupId,
        members: req.user._id,
    })
    .populate("members")
    .lean();


    if (!savingGroup) {
        return res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: "SavingGroup not found"
        });
    }
    return res.status(StatusCodes.OK).json({
        success: true,
        message: "SavingGroup fetched successfully",
        data: savingGroup
    });
}

const searchSavingGroupBySavingGroupCode = async (req, res) => {
    const groupCode = req.params.groupCode;
    const savingGroup = await savingGroupModel.findOne({
        groupCode,
        // members: { $nin: [req.user._id] },
    }).lean();

    console.log

    if (!savingGroup) {
        return res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: "SavingGroup not found",
        });
    }
    return res.status(StatusCodes.OK).json({
        success: true,
        message: "SavingGroup fetched successfully",
        data: savingGroup
    });
}

async function updateSavingGroup(req, res) {
    const { id: savingGroupId } = req.params;
    const savingGroup = await savingGroupModel.findOne({
        _id: savingGroupId,
        members: req.user._id
    });
    if (!savingGroup) {
        return res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: "SavingGroup not found"
        });
    }
    let update = {};
    if (!savingGroup.groupCode) {
        let randomSavingGroupCode = generateAlphanumericCode();
        while (await savingGroupModel.countDocuments({ groupCode: randomSavingGroupCode })) {
            randomSavingGroupCode = generateAlphanumericCode();
        }
        update.groupCode = randomSavingGroupCode;
    }
    if (req.body.name) {
        update.name = req.body.name;
    }
    if (req.body.member_emails && savingGroup.member_admins.map(id => id.toString()).includes(req.user._id.toString())) {
        const members = await userModel.find({ email: { $in: req.body.member_emails } }).select("_id email").lean();
        const member_ids = members.map(m => m?._id?.toString());
        const noAccountMemberEmails = req.body.member_emails.filter(email => !members.find(m => m.email === email));
        await inviteNonExistingEmails(noAccountMemberEmails, savingGroup, req.user);
        update.member_emails = Array.from(new Set([...req.body.member_emails]));
        update.members = [...new Set([...member_ids])];
    }
    if (Object.keys(update).length === 0) {
        return res.status(StatusCodes.OK).json({
            success: true,
            message: "No changes made to the savingGroup",
            data: savingGroup,
        });
    }
    const updated = await savingGroupModel.findByIdAndUpdate(savingGroupId, update, { new: true });

    await makeSavingGroupMembersFriends(updated);

    return res.status(StatusCodes.OK).json({
        success: true,
        message: "SavingGroup updated successfully",
        data: updated,
    });
}

async function deleteSavingGroup(req, res) {
    const { savingGroupId } = req.params;
}

async function joinSavingGroup(req, res) {
    const groupCode = req.params.groupCode;
    const savingGroup = await savingGroupModel.findOne({ groupCode });
    if (!savingGroup) {
        return res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: "SavingGroup not found",
        });
    }
    if (savingGroup.members.map(id => id?.toString()).includes(req.user?._id?.toString())) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: "You are already a member of this savingGroup",
        });
    }
    await savingGroupModel.findByIdAndUpdate(savingGroup._id, {
        $push: { members: req.user._id },
        $addToSet: { member_emails: req.user.email },
    });

    await makeSavingGroupMembersFriends(savingGroup);

    await recentActivityController.addToRecentActivities({
        savingGroup: savingGroup._id,
        user: req.user._id,
        activityType: "JOIN_GROUP",
    });


    return res.status(StatusCodes.OK).json({
        success: true,
        message: "You have successfully joined the savingGroup",
    });
}

export default {
    createSavingGroup,
    getMySavingGroups,
    getSavingGroupById,
    updateSavingGroup,
    deleteSavingGroup,
    joinSavingGroup,
    searchSavingGroupBySavingGroupCode
};