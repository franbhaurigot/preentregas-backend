/**
 * Carga datos de demo: 1 admin, 1 organizador, 2 asistentes y 2 eventos publicados.
 * Uso: npm run seed
 * Respeta las capas: usa services y repositories, nunca modelos.
 */
import { connectDB, disconnectDB } from "../config/db.js";
import { authService, eventService } from "../services/index.js";
import { userRepository } from "../repositories/index.js";
import { logger } from "../utils/logger.js";

const USERS = [
  { first_name: "Carla", last_name: "Admin", email: "admin@mail.com", age: 40, password: "123456", role: "admin" },
  { first_name: "Laura", last_name: "Gomez", email: "laura@mail.com", age: 33, password: "123456", role: "organizer" },
  { first_name: "Pedro", last_name: "Suarez", email: "pedro@mail.com", age: 25, password: "123456" },
  { first_name: "Sofia", last_name: "Rios", email: "sofia@mail.com", age: 29, password: "123456" }
];

const daysFromNow = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

const EVENTS = [
  {
    title: "Node Day",
    description: "Charlas de backend y arquitectura",
    category: "tecnologia",
    date: daysFromNow(30),
    location: "CABA",
    capacity: 50,
    price: 0
  },
  {
    title: "Taller de MongoDB",
    description: "Modelado de datos e indices",
    category: "workshop",
    date: daysFromNow(45),
    location: "Rosario",
    capacity: 2,
    price: 5000
  }
];

/**
 * El registro publico siempre crea usuarios con role "user" (por diseno,
 * ver Pre-entrega 2). Para el seed, si se pide otro rol (organizador, admin),
 * se lo asigna despues por una via administrativa (updateRole), nunca a
 * traves del endpoint/estrategia de registro.
 */
const ensureUser = async ({ role, ...data }) => {
  const existing = await userRepository.findByEmail(data.email);
  if (existing) {
    logger.info(`Usuario ya existente, se omite: ${data.email}`);
    return existing;
  }
  const user = await authService.registerCore(data);
  if (role && role !== user.role) {
    await userRepository.updateRole(user.id, role);
  }
  logger.info(`Usuario creado: ${user.email} (${role ?? user.role})`);
  return userRepository.findByEmail(data.email);
};

const run = async () => {
  await connectDB();

  const [, organizer] = await Promise.all(USERS.map(ensureUser));

  for (const data of EVENTS) {
    const created = await eventService.create(data, { id: String(organizer._id), role: organizer.role });
    const published = await eventService.changeStatus(created.id, "published", {
      id: String(organizer._id),
      role: organizer.role
    });
    logger.info(`Evento creado y publicado: ${published.title} (${published.id}) - cupo ${published.capacity}`);
  }

  logger.info("Seed finalizado. Logins de prueba (todos con password 123456):");
  logger.info("  admin@mail.com (admin) / laura@mail.com (organizer) / pedro@mail.com y sofia@mail.com (user)");
  await disconnectDB();
};

run().catch(async (error) => {
  logger.error("Fallo el seed:", error.message);
  await disconnectDB();
  process.exit(1);
});
