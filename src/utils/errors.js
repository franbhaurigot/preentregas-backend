/**
 * Error de aplicacion con status HTTP y codigo semantico.
 * Las capas de dominio (services/repositories) lanzan estos errores
 * y el middleware central los traduce a la respuesta HTTP.
 */
export class AppError extends Error {
  constructor(message, { status = 500, code = "INTERNAL_ERROR", details = null } = {}) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errors = {
  badRequest: (message = "Datos invalidos", details = null) =>
    new AppError(message, { status: 400, code: "BAD_REQUEST", details }),
  unauthorized: (message = "No autenticado") =>
    new AppError(message, { status: 401, code: "UNAUTHORIZED" }),
  forbidden: (message = "No tenes permisos sobre este recurso") =>
    new AppError(message, { status: 403, code: "FORBIDDEN" }),
  notFound: (message = "Recurso no encontrado") =>
    new AppError(message, { status: 404, code: "NOT_FOUND" }),
  conflict: (message = "Conflicto con el estado actual del recurso", details = null) =>
    new AppError(message, { status: 409, code: "CONFLICT", details }),
  internal: (message = "Error interno del servidor") =>
    new AppError(message, { status: 500, code: "INTERNAL_ERROR" })
};
