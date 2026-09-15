import { authService } from "../services/index.js";
import { ok, created, asyncHandler } from "../utils/http.js";
import { config } from "../config/config.js";

/**
 * Los controllers solo coordinan request/response.
 * No importan modelos ni resuelven reglas de negocio.
 */
const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: config.env === "production",
  maxAge: 24 * 60 * 60 * 1000
};

export const register = asyncHandler(async (req, res) => {
  const { user, token } = await authService.register(req.body);
  res.cookie(config.jwt.cookieName, token, cookieOptions);
  return created(res, { user, token });
});

export const login = asyncHandler(async (req, res) => {
  const { user, token } = await authService.login(req.body);
  res.cookie(config.jwt.cookieName, token, cookieOptions);
  return ok(res, { user, token });
});

export const current = asyncHandler(async (req, res) => {
  const user = await authService.getCurrent(req.user._id ?? req.user.id);
  return ok(res, { user });
});

export const logout = asyncHandler(async (_req, res) => {
  res.clearCookie(config.jwt.cookieName, { ...cookieOptions, maxAge: undefined });
  return ok(res, { message: "Sesion cerrada correctamente" });
});
