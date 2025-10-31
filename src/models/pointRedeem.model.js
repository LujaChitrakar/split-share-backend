import mongoose from "mongoose";
import { required_number } from "./common.schema.js";

const pointRedeemSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true,
    },
    amount: required_number,    
}, {
    timestamps: true,
});

const pointModel = mongoose.model("pointredeemed", pointRedeemSchema);
export default pointModel;
