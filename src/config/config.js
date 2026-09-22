import "dotenv/config";

export const config = {
  env: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 8080,
  // Se acepta MONGO_URL (nombre pedido por la consigna) y, por compatibilidad,
  // MONGO_URI si alguien lo definio con el nombre anterior.
  mongoUrl: process.env.MONGO_URL || process.env.MONGO_URI || "mongodb://localhost:27017/eventos",
  jwt: {
    secret: process.env.JWT_SECRET || "secreto_de_desarrollo",
    expiresIn: process.env.JWT_EXPIRES_IN || "1h",
    cookieName: process.env.COOKIE_NAME || "currentUser",
    // maxAge de la cookie en milisegundos: 1 hora, valor fijo pedido por la consigna.
    cookieMaxAge: 3600000
  },
  mail: {
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT) || 587,
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
    from: process.env.MAIL_FROM || "Plataforma de Eventos <no-reply@eventos.com>",
    get enabled() {
      return Boolean(process.env.MAIL_HOST && process.env.MAIL_USER && process.env.MAIL_PASS);
    }
  }
};
