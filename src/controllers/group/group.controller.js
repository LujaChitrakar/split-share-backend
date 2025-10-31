import groupModel from "../../models/group.model.js";
import userModel from "../../models/user.model.js";
import emailInviteModel from "../../models/emailInvites.model.js";
import fs from "fs";
import path from "path";
import { StatusCodes } from "http-status-codes";
import { sendEmail } from "../../services/email.service.js";
import expenseModel from "../../models/expense.model.js";
import groupPaymentModel from "../../models/groupPayment.model.js";
import { generateAlphanumericCode } from "../../utils/group.utils.js";
import expenseController from "./expense.controller.js";
import { FRIEND_REQUEST_STATUS } from "../../constants/user.constants.js";
import friendshipModel from "../../models/friendship.model.js";
import recentActivityController from "../recentActivity/recentActivity.controller.js";

async function inviteNonExistingEmails(member_emails, group, inviter) {
    const invites = await Promise.all(member_emails.map(async (email) => {
        let existingInvite = await emailInviteModel.findOne({ email });
        if (!existingInvite) {
            existingInvite = await new emailInviteModel({
                email,
                groups_invited: [group?._id],
                invited_by: inviter?._id,
            }).save();
        } else {
            if (!existingInvite.groups_invited.map(id => id.toString()).includes(group?._id.toString())) {
                existingInvite = await emailInviteModel.findByIdAndUpdate(existingInvite._id, {
                    $push: { groups_invited: group?._id }
                }, {
                    new: true
                });
            }
        }
        return existingInvite;
    }));

    const emailsSent = await Promise.all(invites.map(async (invite) => {
        let emailTemplateString = fs.readFileSync(path.join(process.cwd(), 'src', 'templates', 'emailInvite.template.html'), 'utf-8');

        emailTemplateString = emailTemplateString.replace("{{groupName}}", group?.name || "a group");
        emailTemplateString = emailTemplateString.replace("{{inviterName}}", inviter?.fullname || inviter?.username || inviter?.email || "Unknown");

        return await sendEmail(invite.email, "You've been invited to join a group", emailTemplateString);
    }));
    return emailsSent;
}

async function createGroup(req, res) {
    let member_emails = req.body.member_emails || [];
    member_emails = Array.from(new Set([req.user.email, ...member_emails]));

    const members = await userModel.find({ email: { $in: member_emails } }).select("_id email").lean();
    const noAccountMemberEmails = member_emails.filter(email => !members.find(m => m.email === email));

    let member_ids = Array.from(new Set([req.user?._id.toString(), ...members.map(m => m?._id?.toString())]));

    let randomGroupCode = generateAlphanumericCode();
    while (await groupModel.countDocuments({ groupCode: randomGroupCode })) {
        randomGroupCode = generateAlphanumericCode();
    }

    const newGroup = await new groupModel({
        groupCode: randomGroupCode,
        name: req.body.name,
        member_admins: [req.user._id],
        members: member_ids,
        created_by: req?.user?._id,
        member_emails: member_emails,
    }).save();

    await inviteNonExistingEmails(noAccountMemberEmails, newGroup, req.user);

    await makeGroupMembersFriends(newGroup);

    await recentActivityController.addToRecentActivities({
        group: newGroup._id,
        user: req.user._id,
        activityType: "CREATE_GROUP",
    });

    return res.status(StatusCodes.OK).json({
        success: true,
        message: "Group created successfully",
        data: newGroup
    });
}

async function makeGroupMembersFriends(group) {
    const members = await groupModel.findById(group._id).select("members").lean();
    const memberIds = members?.members.map(member => member.toString());

    // let friendShips = await Promise.all(memberIds.map(async (memberId) => {
    //     const otherMemberIds = memberIds.filter(id => id !== memberId);
    //     return await Promise.all(otherMemberIds.map(async (otherMemberId) => {
    //         const isFriends = await friendshipModel.findOne({
    //             $or: [
    //                 { user_one: memberId, user_two: otherMemberId },
    //                 { user_one: otherMemberId, user_two: memberId },
    //             ],
    //             status: FRIEND_REQUEST_STATUS.ACCEPTED,
    //         }).lean();
    //         if (!isFriends) {
    //             return await new friendshipModel({
    //                 user_one: memberId,
    //                 user_two: otherMemberId,
    //                 status: FRIEND_REQUEST_STATUS.ACCEPTED,
    //             }).save();
    //         }
    //         return isFriends;
    //     }));
    // }));

    let friendShips = [];
    for (let i = 0; i < memberIds.length; i++) {
        for (let j = 0; j < memberIds.length; j++) {
            if (i !== j) {
                const memberId = memberIds[i];
                const otherMemberId = memberIds[j];
                const isFriends = await friendshipModel.findOne({
                    $or: [
                        { user_one: memberId, user_two: otherMemberId },
                        { user_one: otherMemberId, user_two: memberId },
                    ],
                    status: FRIEND_REQUEST_STATUS.ACCEPTED,
                }).lean();
                if (!isFriends) {
                    const newFriendship = await new friendshipModel({
                        user_one: memberId,
                        user_two: otherMemberId,
                        status: FRIEND_REQUEST_STATUS.ACCEPTED,
                    }).save();
                    friendShips.push(newFriendship);
                } else {
                    friendShips.push(isFriends);
                }
            }
        }
    }

}

async function getMyGroups(req, res) {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    let filter = {
        members: req.user._id,
    };
    if (req.query?.q) {
        filter.name = { $regex: req.query.q, $options: 'i' };
    }


    const skip = (page - 1) * limit;
    const groups = await groupModel.find(filter).sort({
        settled: 1,
    }).skip(skip).limit(limit).sort({ createdAt: -1 }).lean();
    const totalGroups = await groupModel.countDocuments(filter);
    const totalPages = Math.ceil(totalGroups / limit);
    return res.status(StatusCodes.OK).json({
        success: true,
        message: "Groups fetched successfully",
        data: groups,
        pagination: {
            totalCount: totalGroups,
            totalPages,
            currentPage: page,
            limit,
        }
    });
}

async function getGroupById(req, res) {
    const { id: groupId } = req.params;

    await expenseController.calculateGroupBalances(groupId, true);

    const group = await groupModel.findOne({
        _id: groupId,
        members: req.user._id,
    }).populate("members").lean();

    const groupExpenses = await expenseModel.find({
        group: group?._id,
    }).lean();

    const groupPayments = await groupPaymentModel.find({
        group: group?._id
    }).lean();

    group.expenses = groupExpenses;
    group.payments = groupPayments;

    if (!group) {
        return res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: "Group not found"
        });
    }
    return res.status(StatusCodes.OK).json({
        success: true,
        message: "Group fetched successfully",
        data: group
    });
}

const searchGroupByGroupCode = async (req, res) => {
    const groupCode = req.params.groupCode;
    const group = await groupModel.findOne({
        groupCode,
        // members: { $nin: [req.user._id] },
    }).lean();

    if (!group) {
        return res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: "Group not found",
        });
    }
    return res.status(StatusCodes.OK).json({
        success: true,
        message: "Group fetched successfully",
        data: group
    });
}

async function updateGroup(req, res) {
    const { id: groupId } = req.params;
    const group = await groupModel.findOne({
        _id: groupId,
        members: req.user._id
    });
    if (!group) {
        return res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: "Group not found"
        });
    }
    let update = {};
    if (!group.groupCode) {
        let randomGroupCode = generateAlphanumericCode();
        while (await groupModel.countDocuments({ groupCode: randomGroupCode })) {
            randomGroupCode = generateAlphanumericCode();
        }
        update.groupCode = randomGroupCode;
    }
    if (req.body.name) {
        update.name = req.body.name;
    }

    if (req.body.member_emails && group.member_admins.map(id => id.toString()).includes(req.user._id.toString())) {
        const members = await userModel.find({ email: { $in: req.body.member_emails } }).select("_id email").lean();
        const member_ids = members.map(m => m?._id?.toString());
        const noAccountMemberEmails = req.body.member_emails.filter(email => !members.find(m => m.email === email));
        await inviteNonExistingEmails(noAccountMemberEmails, group, req.user);
        update.member_emails = Array.from(new Set([...req.body.member_emails]));
        update.members = [...new Set([...member_ids])];
    }
    if (Object.keys(update).length === 0) {
        return res.status(StatusCodes.OK).json({
            success: true,
            message: "No changes made to the group",
            data: group,
        });
    }
    const updated = await groupModel.findByIdAndUpdate(groupId, update, { new: true });

    await makeGroupMembersFriends(updated);

    return res.status(StatusCodes.OK).json({
        success: true,
        message: "Group updated successfully",
        data: updated,
    });
}

async function deleteGroup(req, res) {
    const { groupId } = req.params;
}

async function joinGroup(req, res) {
    const groupCode = req.params.groupCode;
    const group = await groupModel.findOne({ groupCode });
    if (!group) {
        return res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: "Group not found",
        });
    }
    if (group.members.map(id => id?.toString()).includes(req.user?._id?.toString())) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: "You are already a member of this group",
        });
    }
    await groupModel.findByIdAndUpdate(group._id, {
        $push: { members: req.user._id },
        $addToSet: { member_emails: req.user.email },
    });

    await makeGroupMembersFriends(group);

    await recentActivityController.addToRecentActivities({
        group: group._id,
        user: req.user._id,
        activityType: "JOIN_GROUP",
    });


    return res.status(StatusCodes.OK).json({
        success: true,
        message: "You have successfully joined the group",
        data: group,
    });
}

export default {
    createGroup,
    getMyGroups,
    getGroupById,
    updateGroup,
    deleteGroup,
    joinGroup,
    searchGroupByGroupCode
};