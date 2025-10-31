import express from "express";
import "express-async-errors";
import multerConfig from "../configs/multer.config.js";
import uploadController from "../controllers/upload.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/upload", authMiddleware(), multerConfig.single("image"), uploadController.handleUploadedFile);
router.get("/upload/:filename", uploadController.getUploadedFile);

export default router;