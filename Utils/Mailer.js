const nodemailer = require("nodemailer");

function getMailerConfig() {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USER,
    SMTP_PASS,
    SMTP_FROM,
  } = process.env;

  return {
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: SMTP_SECURE === "true",
    user: SMTP_USER,
    pass: SMTP_PASS,
    from: SMTP_FROM,
  };
}

function ensureMailerConfig(config) {
  if (!config.host || !config.port || !config.user || !config.pass || !config.from) {
    throw new Error("SMTP settings are missing in environment variables");
  }
}

function createTransporter() {
  const config = getMailerConfig();
  ensureMailerConfig(config);

  return {
    transporter: nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    }),
    from: config.from,
  };
}

async function sendEmail({ to, subject, text }) {
  const { transporter, from } = createTransporter();

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
  });
}

module.exports = {
  sendEmail,
};
