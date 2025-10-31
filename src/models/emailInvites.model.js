import mongoose from "mongoose";
import { required_string } from "./common.schema.js";

const email_invite_schema = mongoose.Schema({
    email: required_string,
    groups_invited: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "groups",
    }],
    invited_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true,
    },
}, {
    timestamps: true,
});

const emailInviteModel = mongoose.model("email_invites", email_invite_schema);
export default emailInviteModel;





