import mongoose from "mongoose";
import envConfig from "../configs/env.config.js";

export const connectMongoose = async () => {
    const connection = await mongoose.connect(envConfig.DATABASE_URL);
    return connection;
};

