import { StatusCodes } from "http-status-codes";

const errorHandlerMiddleware = (err, req, res, next) => {
  let customError = {
    success: false,
    statusCode: err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
    message: err.message || "Something went wrong, please try again later",
  };
  if (err.name === "ValidationError") {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: "Validation error",
      validationErrors: Object.keys(err.errors).map((path) => {
        if (err.errors[path].kind === "enum") {
          return {
            path,
            message: `Invalid value '${
              err.errors[path].value
            }' for '${path}', valid values are ${err.errors[
              path
            ].properties.enumValues.join(", ")}`,
          };
        } else if (err.errors[path].kind === "required") {
          return { path, message: `'${path}' is required` };
        } else if (err.errors[path].kind === "unique") {
          return { path, message: `'${path}' must be unique` };
        } else if (err.errors[path].kind === "ObjectId") {
          return {
            path,
            message: `'${path}' must be a valid ObjectId`,
          };
        }
        return { path, message: err.errors[path].message };
      }),
    });
  }
  if (err.code && err.code === 11000) {
    customError.message = `Duplicate value entered for ${Object.keys(
      err.keyValue
    )} field, please choose another value`;
    customError.statusCode = 400;
  }
  if (err.name === "CastError") {
    customError.message = `No item found with id : ${err.value}`;
    customError.statusCode = 404;
  }
  console.error(`ERROR in ROUTE:${req.method} ${req?.url}\n`, err);
  return res.status(customError.statusCode).json({
    success: false,
    msg: customError.message,
    message: customError.message,
  });
};

export default errorHandlerMiddleware;
