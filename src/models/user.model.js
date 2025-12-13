import mongoose from "mongoose";
import { required_boolean, required_number, required_string, required_unique_string } from "./common.schema.js";

const userSchema = mongoose.Schema({
    privyId: required_unique_string,
    wallet_public_key: required_string,
    username: String,
    email: required_unique_string,
    password: String,
    phone_number: String,
    address: String,
    fullname: String,
    userPIN: String,
    notification_token: String,
    profile_picture: String,
    profile_visible: {
        ...required_boolean,
        default: true,
    },

    friends_count: {
        type: Number,
        default: 0,
    },
    groups_count: {
        type: Number,
        default: 0,
    },

    // User access fields
    is_deleted: { type: Boolean, default: false },
    is_active: { type: Boolean, default: true },


    saving_wallets: [{
        wallet_public_key: required_string,
        wallet_purpose: required_string,
    }],


    // Onboarding and referal fields
    onboarding_completed: { type: Boolean, default: false },
    points: {
        ...required_number,
        default: 0,
    },
    totalRedeemedPoints: {
        ...required_number,
        default: 0,
    },
}, {
    timestamps: true,
});

userSchema.index({ language: 1 });
userSchema.index({ is_deleted: 1 });
userSchema.index({ is_active: 1 });

const userModel = mongoose.model("users", userSchema);
export default userModel;
