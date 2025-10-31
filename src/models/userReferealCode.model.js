import mongoose from "mongoose";
import { required_string } from "./common.schema.js";

const referalCodeSchema = mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true,
    },
    code: {
        ...required_string,
        unique: true,
    },
    usedCount: {
        type: Number,
        default: 0,
    },
    maxUseCount: {
        type: Number,
        default: 10,
    },
    usedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
    }],
}, {
    timestamps: true,
});

const referalCodeModel = mongoose.model("referalcodes", referalCodeSchema);
export default referalCodeModel;
