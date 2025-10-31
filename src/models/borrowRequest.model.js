import mongoose from "mongoose";
import { required_number, required_string } from "./common.schema.js";
import { BORROW_REQUEST_STATUS } from "../constants/user.constants.js";

const borrowRequestSchema = mongoose.Schema({
    requestor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true,
    },
    amount: required_number,
    reason: String,
    requested_to: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true,
    },
    status: {
        type: String,
        required: true,
        enum: Object.values(BORROW_REQUEST_STATUS)
    },
    transactionId: String,
}, {
    timestamps: true,
});

const borrowRequestModel = mongoose.model("borrow_request", borrowRequestSchema);
export default borrowRequestModel;


