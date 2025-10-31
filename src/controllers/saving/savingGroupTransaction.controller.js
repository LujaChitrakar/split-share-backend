import { StatusCodes } from "http-status-codes";
import savingGroupTransactionModel from "../../models/savingGroupTransaction.model.js"

const addSavingGroupTransaction = async (req, res, next) => {
    const newTransaction = await new savingGroupTransactionModel({
        ...req.body,
        initiator: req.user?._id,
    }).save();
    return res.status(StatusCodes.OK).json({
        success: true,
        message: "Transaction created successfully",
        data: newTransaction,
    })
}

const getSavingGroupTransactions = async (req, res, next) => {
    const savingGroupId = req.params?.savingGroupId;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    let filter = {
        savingGroup: savingGroupId,
    };
    const skip = (page - 1) * limit;
    const transactions = await savingGroupTransactionModel.find(filter)
        .skip(skip)
        .limit(limit)
        .populate("addedMember");



}

export default {
    addSavingGroupTransaction,
    getSavingGroupTransactions,
}
