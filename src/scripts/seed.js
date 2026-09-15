/**
 * Carga datos de demo: 1 organizador, 2 asistentes y 2 eventos publicados.
 * Uso: npm run seed
 * Respeta las capas: usa services y repositories, nunca modelos.
 */
import { connectDB, disconnectDB } from "../config/db.js";
import { authService, eventService } from "../services/index.js";
import { userRepository } from "../repositories/index.js";
import { logger } from "../utils/logger.js";

const USERS = [
  { first_name: "Laura", last_name: "Gomez", email: "laura@mail.com", age: 33, password: "123456", role: "organizer" },
  { first_name: "Pedro", last_name: "Suarez", email: "pedro@mail.com", age: 25, password: "123456", role: "user" },
  { first_name: "Sofia", last_name: "Rios", email: "sofia@mail.com", age: 29, password: "123456", role: "user" }
];

const daysFromNow = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

const EVENTS = [
  { title: "Node Day", description: "Charlas de backend y arquitectura", date: daysFromNow(30), location: "CABA", capacity: 50, price: 0, status: "published" },
  { title: "Taller de MongoDB", description: "Modelado de datos e indices", date: daysFromNow(45), location: "Rosario", capacity: 2, price: 5000, status: "published" }
];

const ensureUser = async (data) => {
  const existing = await userRepository.findByEmail(data.email);
  if (existing) {
    logger.info(`Usuario ya existente, se omite: ${data.email}`);
    return existing;
  }
  const { user } = await authService.register(data);
  logger.info(`Usuario creado: ${user.email} (${user.role})`);
  return userRepository.findByEmail(data.email);
};

const run = async () => {
  await connectDB();

  const [organizer] = await Promise.all(USERS.map(ensureUser));

  for (const data of EVENTS) {
    const event = await eventService.create(data, { id: String(organizer._id), role: organizer.role });
    logger.info(`Evento creado: ${event.title} (${event.id}) - cupo ${event.capacity}`);
  }

  logger.info("Seed finalizado. Login de prueba: laura@mail.com / 123456");
  await disconnectDB();
};

run().catch(async (error) => {
  logger.error("Fallo el seed:", error.message);
  await disconnectDB();
  process.exit(1);
});
