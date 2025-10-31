import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.route.js";
import friendshipRouter from "./routes/friendship.route.js";
import userRouter from "./routes/user.route.js";
import recentRouter from "./routes/recents.route.js";
import groupRouter from "./routes/group.route.js";
import savingGroupRouter from "./routes/saving.route.js";
import uploadRouter from "./routes/upload.route.js";
import transactionRouter from "./routes/transaction.route.js";
import borrowRequestRouter from "./routes/borrowRequest.routes.js";
import errorHandlerMiddleware from "./middlewares/error.middleware.js";
import morgan from "morgan";

const app = express();

app.use(cors());
app.use(cookieParser());
app.use(express.json({ maxSize: "100mb", maxLength: "100mb" }));
app.use(express.urlencoded({ extended: true, maxSize: "100mb", maxLength: "100mb" }));
app.use(morgan("dev"));

// routes
app.use(authRouter);
app.use(friendshipRouter);
app.use(groupRouter);
app.use(savingGroupRouter);
app.use(userRouter);
app.use(recentRouter);
app.use(uploadRouter);
app.use(transactionRouter);
app.use(borrowRequestRouter);

app.get("/", (req, res, next) => {
    return res.status(200).json({
        message: "Welcome to the API"
    })
})

app.use(errorHandlerMiddleware);

export default app;
