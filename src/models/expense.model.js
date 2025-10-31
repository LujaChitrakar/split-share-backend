import mongoose from "mongoose";
import { required_boolean, required_string } from "./common.schema.js";

const expenseSchema = mongoose.Schema({
    group: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "groups",
        required: true,
    },
    expense_title: required_string,
    amount: {
        type: Number,
        required: true,
    },
    paid_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true,
    },
    split_between: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true,
    }],
    settled: {
        ...required_boolean,
        default: false,
    }
}, {
    timestamps: true,
});

const expenseModel = mongoose.model("expenses", expenseSchema);
export default expenseModel;
