import { StatusCodes } from "http-status-codes";
import { ZodError } from "zod";

const validateZodSchema = (schema) => {
    return (req, res, next) => {
        try {
            req.body = schema.parse(req.body);
            next();
        } catch (error) {
            // Zod errors have an 'issues' property, not 'errors'
            if (error instanceof ZodError) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: "Validation error",
                    validationErrors: error.issues.map((err) => ({
                        path: err.path.join('.'),
                        message: err.message,
                    })),
                });
            }
            next(error);
        }
    };
};

export default validateZodSchema;