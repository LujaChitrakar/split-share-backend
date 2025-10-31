import mongoose from "mongoose";
import { required_number, required_string } from "./common.schema.js";

const savingGroupTransactionSchema = mongoose.Schema({
    initiator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true,
    },
    savingGroup: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "saving_groups",
        required: true,
    },
    transaction_type: {
        ...required_string,
        enum: [
            "SAVE",
            "WITHDRAW",
            "UPDATE_THRESHOLD",
            "ADD_MEMBER",
        ]
    },
    transactionId: required_string,
    amount: Number,
    add_member_address: String,
    addedMember: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true,
    },
}, {
    timestamps: true,
});

const savingGroupTransactionModel = mongoose.model("saving_transactions", savingGroupTransactionSchema);
export default savingGroupTransactionModel;
