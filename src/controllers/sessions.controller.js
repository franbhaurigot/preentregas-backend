import { UserDTO } from "../dto/index.js";
import { signToken } from "../utils/jwt.js";
import { ok, created, message, asyncHandler } from "../utils/http.js";
import { config } from "../config/config.js";

/**
 * Los controllers solo coordinan request/response.
 * La validacion y la creacion/verificacion de usuario ya sucedieron
 * en la estrategia de Passport antes de llegar aca (req.user).
 */
const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: config.env === "production",
  maxAge: config.jwt.cookieMaxAge
};

/** POST /register: passport ya creo el usuario (estrategia "register"), solo se responde. */
// registerCore ya devuelve el usuario pasado por UserDTO: no se vuelve a transformar.
export const register = asyncHandler(async (req, res) => created(res, req.user));

/**
 * POST /login: passport ya valido las credenciales (estrategia "login").
 * El JWT se genera ACA, en el controller, nunca en la estrategia.
 */
export const login = asyncHandler(async (req, res) => {
  const token = signToken({ id: String(req.user._id), email: req.user.email, role: req.user.role });
  res.cookie(config.jwt.cookieName, token, cookieOptions);
  return message(res, "Login correcto");
});

/** GET /current: req.user ya viene resuelto por el middleware authenticate. */
export const current = asyncHandler(async (req, res) => ok(res, UserDTO.session(req.user)));

/** POST /logout: no pasa por Passport, solo limpia la cookie. */
export const logout = asyncHandler(async (_req, res) => {
  res.clearCookie(config.jwt.cookieName, { ...cookieOptions, maxAge: undefined });
  return message(res, "Sesión cerrada");
});
