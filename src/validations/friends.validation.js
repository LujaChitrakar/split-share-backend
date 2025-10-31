import z from 'zod';

export const sendFriendRequestSchema = z.object({
    userEmail: z.string().min(1, "userEmail is required to send friend request"),
});

export const acceptRejectFriendRequestSchema = z.object({
    requestId: z.string().min(1, "requestId is required to accept or reject friend request"),
});

export const removeFriendSchema = z.object({
    friendId: z.string().min(1, "friendId is required to remove friend"),
});




