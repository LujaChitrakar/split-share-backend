import mongoose from "mongoose";
import { required_string } from "./common.schema.js";
import { FRIEND_REQUEST_STATUS } from "../constants/user.constants.js";

const friendshipSchema = mongoose.Schema({
    user_one: { // requester
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true,
    },
    user_two: { // requestee
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true,
    },
    status: {
        ...required_string,
        enum: Object.values(FRIEND_REQUEST_STATUS),
        default: FRIEND_REQUEST_STATUS.PENDING,
    },
}, {
    timestamps: true,
});

const friendshipModel = mongoose.model("friendships", friendshipSchema);
export default friendshipModel;
