import express from "express";
import AuthController from "../controllers/auth/auth.controller.js";
import validateZodSchema from "../middlewares/validation.middleware.js";
import { signupSchema } from "../validations/auth.validation.js";
import "express-async-errors";

const router = express.Router();

router.post("/auth/signup", validateZodSchema(signupSchema), AuthController.signup);
router.post("/auth/login", AuthController.login);
router.post("/auth/signupOrLoginWithPrivy", AuthController.signupOrLoginWithPrivy);

router.post("/auth/register/pin", AuthController.registerPin)
router.post("/auth/verify/pin", AuthController.verifyPin)

export default router;