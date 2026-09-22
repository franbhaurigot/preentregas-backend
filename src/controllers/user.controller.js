import { userService } from "../services/user.service.js";
import { ok, asyncHandler } from "../utils/http.js";

/** GET /api/users: ruta exclusiva para admin (ver matriz de permisos en el README). */
export const listUsers = asyncHandler(async (req, res) => ok(res, await userService.listAll(req.query)));
