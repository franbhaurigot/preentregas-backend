import { AppError } from "../utils/errors.js";
import { config } from "../config/config.js";
import { logger } from "../utils/logger.js";

/** Traduce errores tecnicos conocidos a errores de aplicacion. */
const normalize = (err) => {
  if (err instanceof AppError) return err;

  if (err?.name === "CastError") {
    return new AppError("El identificador enviado no es valido", { status: 400, code: "BAD_REQUEST" });
  }
  if (err?.name === "ValidationError") {
    return new AppError("Datos invalidos", {
      status: 400,
      code: "VALIDATION_ERROR",
      details: Object.values(err.errors ?? {}).map((e) => e.message)
    });
  }
  if (err?.code === 11000) {
    return new AppError("El recurso ya existe", {
      status: 409,
      code: "DUPLICATE_KEY",
      details: err.keyValue ?? null
    });
  }
  if (err?.name === "JsonWebTokenError" || err?.name === "TokenExpiredError") {
    return new AppError("Sesion invalida o expirada", { status: 401, code: "UNAUTHORIZED" });
  }
  if (err?.type === "entity.parse.failed") {
    return new AppError("El body enviado no es un JSON valido", { status: 400, code: "BAD_REQUEST" });
  }

  return new AppError("Error interno del servidor", { status: 500, code: "INTERNAL_ERROR" });
};

/** Middleware central de errores: unica salida de errores de la API. */
export const errorHandler = (err, _req, res, _next) => {
  const error = normalize(err);

  if (error.status >= 500) logger.error(err?.stack || err?.message || String(err));

  const body = {
    status: "error",
    error: {
      code: error.code,
      message: error.message
    }
  };
  if (error.details) body.error.details = error.details;
  if (config.env === "development" && error.status >= 500) body.error.stack = err?.stack;

  res.status(error.status).json(body);
};
