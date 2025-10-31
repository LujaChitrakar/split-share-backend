import mongoose from "mongoose";
import { required_number, required_string } from "./common.schema.js";

const groupPayment = mongoose.Schema({
    group: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "groups",
        required: true,
    },
    amount: required_number,
    transactionId: required_string,
    paid_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users"
    },
    paid_to: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users"
    },

    paid_by_address: String,
    paid_to_address: String,


}, {
    timestamps: true,
});

const groupPaymentModel = mongoose.model("grouppayments", groupPayment);
export default groupPaymentModel;
