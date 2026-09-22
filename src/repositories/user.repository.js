import { userDAO } from "../dao/user.dao.js";

/**
 * Capa Repository: expone operaciones orientadas al dominio.
 * No conoce Mongoose; solo habla con el DAO.
 */
export class UserRepository {
  constructor(dao = userDAO) {
    this.dao = dao;
  }

  createUser(data) {
    return this.dao.create(data);
  }

  findById(id) {
    return this.dao.findById(id);
  }

  findByEmail(email) {
    return this.dao.findOne({ email: String(email).toLowerCase().trim() });
  }

  existsByEmail(email) {
    return this.dao.count({ email: String(email).toLowerCase().trim() }).then((n) => n > 0);
  }

  updateProfile(id, data) {
    return this.dao.updateById(id, data);
  }

  updatePassword(id, hashedPassword) {
    return this.dao.updateById(id, { password: hashedPassword });
  }

  /**
   * Cambia el rol de un usuario. Uso administrativo/interno unicamente
   * (seed, panel de admin): el registro publico nunca llama a este metodo.
   */
  updateRole(id, role) {
    return this.dao.updateById(id, { role });
  }

  /** Listado completo de usuarios. Reservado a rutas admin-only. */
  findAll({ limit, skip } = {}) {
    return this.dao.find({}, { limit, skip });
  }

  countAll() {
    return this.dao.count({});
  }
}

export const userRepository = new UserRepository();
