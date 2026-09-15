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
}

export const userRepository = new UserRepository();
