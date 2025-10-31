import mongoose from "mongoose";
import { required_number, required_string } from "./common.schema.js";

const savingGroup = mongoose.Schema({
    name: required_string,
    description: String,
    groupCode: required_string,
    member_emails: [required_string],
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
    }],
    expectedMembersCount: Number,
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true,
    },

    multisig_pda: String,
    saving_address: String,
    member_addresses: [required_string],
    threshold: Number,
    target_saving: required_number,
    reached_savings: {
        ...required_number,
        default: 0,
    },

    settled: {
        type: Boolean,
        default: false, 
    },

    group_type: {
        type: String,
        enum: ["PERSONAL", "SQUAD"]
    },
}, {
    timestamps: true,
});

const savingGroupModel = mongoose.model("saving_groups", savingGroup);
export default savingGroupModel;
