import nodemailer from "nodemailer";
import { config } from "../config/config.js";
import { logger } from "./logger.js";

let transporter = null;

const getTransporter = () => {
  if (!config.mail.enabled) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.mail.host,
      port: config.mail.port,
      secure: config.mail.port === 465,
      auth: { user: config.mail.user, pass: config.mail.pass }
    });
  }
  return transporter;
};

/**
 * Envio de email tolerante a fallos: una caida del SMTP no debe
 * romper una inscripcion ya confirmada en base de datos.
 */
export const sendMail = async ({ to, subject, html }) => {
  const client = getTransporter();
  if (!client) {
    logger.warn("Envio de email omitido: configuracion SMTP incompleta");
    return { sent: false, reason: "mail_disabled" };
  }
  try {
    await client.sendMail({ from: config.mail.from, to, subject, html });
    return { sent: true };
  } catch (error) {
    logger.error("Fallo el envio de email:", error.message);
    return { sent: false, reason: "smtp_error" };
  }
};
