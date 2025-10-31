import mongoose from "mongoose";

const recentActivitySchema = mongoose.Schema({
    group: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "groups",
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true,
    },
    otherUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users"
    },
    transactionId: String,
    sender_wallet_address: String,
    receiver_wallet_address: String,
    activityType: {
        type: String,
        enum: [
            "CREATE_GROUP",
            "JOIN_GROUP",
            "SEND_FRIEND_REQUEST",
            "ACCEPT_FRIEND_REQUEST",
            "REJECT_FRIEND_REQUEST",
            "REMOVED_FRIEND",
            "CREATE_SAVING_GROUP",
            "JOIN_SAVING_GROUP",
            "ADD_EXPENSE",
            "UPDATE_EXPENSE",
            "DELETE_EXPENSE",
            "SETTLE_PAYMENT",
            "ADD_SAVING",
            "LOG_IN",
            "LENT_MONEY",
            "SENT_MONEY",
            "RECEIVED_MONEY",
            "BORROWED_MONEY",
            "APPLIED_REFERAL_CODE",
            "REFERRED_USER",
            "REDEEMED_CASHBACK",
            "SEND_BORROW_REQUEST",
            "ACCEPTED_BORROW_REQUEST",
            "REJECTED_BORROW_REQUEST",
        ]
    },
    amount: Number,
    purpose: String,

}, {
    timestamps: true,
});

const recentActivityModel = mongoose.model("recentactivities", recentActivitySchema);
export default recentActivityModel;
