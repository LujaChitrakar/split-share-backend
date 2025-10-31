import mongoose from "mongoose";
import { required_string } from "./common.schema.js";

const groupSchema = mongoose.Schema({
    groupCode: required_string,
    name: required_string,
    member_emails: [required_string],
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
    }],
    member_admins: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
    }],
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true,
    },

    balances: mongoose.Schema.Types.Mixed,
    settled: {
        type: Boolean,
        default: false,
    }

}, {
    timestamps: true,
});

const groupModel = mongoose.model("groups", groupSchema);
export default groupModel;
