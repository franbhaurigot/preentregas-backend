/** Formato de respuesta unico para toda la API. */
export const ok = (res, payload, status = 200) =>
  res.status(status).json({ status: "success", payload });

export const created = (res, payload) => ok(res, payload, 201);

/** Respuesta de solo mensaje, sin payload (login, logout). */
export const message = (res, text, status = 200) =>
  res.status(status).json({ status: "success", message: text });

/** Evita try/catch repetido en cada controller: delega al error handler. */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
