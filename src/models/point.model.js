import mongoose from "mongoose";
import { required_number } from "./common.schema.js";

const pointSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true,
    },
    amount: required_number,
    message: String,
    rewardType: {
        type: String,
        enum: [
            "REFERAL",
            "STREAK"
        ],
        required: true,
    }
}, {
    timestamps: true,
});

const pointModel = mongoose.model("points", pointSchema);
export default pointModel;
