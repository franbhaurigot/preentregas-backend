import { toId } from "./helpers.js";

/**
 * DTO de usuario. Nunca expone password (ni hasheado),
 * ni campos internos como __v.
 */
export class UserDTO {
  static current(user) {
    if (!user) return null;
    return {
      id: toId(user),
      first_name: user.first_name,
      last_name: user.last_name,
      full_name: `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim(),
      email: user.email,
      age: user.age ?? null,
      role: user.role
    };
  }

  /** Version reducida para documentos relacionados (populate). */
  static publicProfile(user) {
    if (!user) return null;
    return {
      id: toId(user),
      full_name: `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim(),
      email: user.email,
      role: user.role
    };
  }

  static list(users = []) {
    return users.map((u) => UserDTO.current(u));
  }
}
