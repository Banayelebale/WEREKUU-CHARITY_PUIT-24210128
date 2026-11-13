import assert from "node:assert/strict";
import test from "node:test";
import { createOtpEmailSender } from "../src/email.js";

test("SMTP sender uses standard defaults when port and TLS setting are blank", () => {
  const sendOtpEmail = createOtpEmailSender({
    SMTP_HOST: "smtp.example.test",
    SMTP_PORT: " ",
    SMTP_SECURE: " "
  });
  assert.equal(typeof sendOtpEmail, "function");
});

test("Resend HTTP API sends OTP without requiring SMTP configuration", async () => {
  let request;
  const sendOtpEmail = createOtpEmailSender({
    RESEND_API_KEY: "test-resend-key",
    MAIL_FROM: "Haven <login@example.test>"
  }, async (...args) => {
    request = args;
    return { ok: true };
  });

  await sendOtpEmail({ to: "student@example.test", code: "123456" });

  assert.equal(request[0], "https://api.resend.com/emails");
  assert.equal(request[1].headers.Authorization, "Bearer test-resend-key");
  assert.deepEqual(JSON.parse(request[1].body), {
    from: "Haven <login@example.test>",
    to: ["student@example.test"],
    subject: "Your Haven Hostel sign-in code",
    text: "Your Haven Hostel verification code is 123456.\n\nIt expires in five minutes. If you did not try to sign in, you can ignore this email."
  });
});

test("production requires a configured OTP email provider", async () => {
  const sendOtpEmail = createOtpEmailSender({ NODE_ENV: "production" });
  await assert.rejects(
    sendOtpEmail({ to: "lecturer@example.test", code: "123456" }),
    /OTP email delivery is not configured/
  );
});

test("Resend API errors are surfaced to the OTP flow", async () => {
  const sendOtpEmail = createOtpEmailSender({
    RESEND_API_KEY: "test-resend-key"
  }, async () => ({
    ok: false,
    status: 401,
    text: async () => "Invalid API key"
  }));

  await assert.rejects(
    sendOtpEmail({ to: "student@example.test", code: "123456" }),
    /Resend email API returned HTTP 401/
  );
});

test("SMTP sender accepts common TLS spellings and infers secure SMTP on port 465", () => {
  assert.equal(typeof createOtpEmailSender({
    SMTP_HOST: "smtp.example.test",
    SMTP_PORT: "465"
  }), "function");
  assert.equal(typeof createOtpEmailSender({
    SMTP_HOST: "smtp.example.test",
    SMTP_SECURE: " YES "
  }), "function");
  assert.equal(typeof createOtpEmailSender({
    SMTP_HOST: "smtp.example.test",
    SMTP_SECURE: "0"
  }), "function");
  assert.equal(typeof createOtpEmailSender({
    SMTP_HOST: "smtp.example.test",
    SMTP_SECURE: "STARTTLS"
  }), "function");
  assert.equal(typeof createOtpEmailSender({
    SMTP_HOST: "smtp.example.test",
    SMTP_SECURE: "SSL"
  }), "function");
  assert.equal(typeof createOtpEmailSender({
    SMTP_HOST: "smtp.example.test",
    SMTP_SECURE: "TLS"
  }), "function");
  assert.equal(typeof createOtpEmailSender({
    SMTP_HOST: "smtp.example.test",
    SMTP_PORT: "465",
    SMTP_SECURE: "AUTO"
  }), "function");
});

test("SMTP sender rejects invalid configured ports", () => {
  assert.throws(
    () => createOtpEmailSender({ SMTP_HOST: "smtp.example.test", SMTP_PORT: "not-a-port" }),
    /SMTP_PORT must be a number from 1 to 65535/
  );
});

test("SMTP sender warns and infers TLS from port for unrecognized settings", () => {
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (message) => warnings.push(message);
  try {
    assert.equal(typeof createOtpEmailSender({
      SMTP_HOST: "smtp.example.test",
      SMTP_PORT: "465",
      SMTP_SECURE: "enabled"
    }), "function");
    assert.match(warnings[0], /selecting SMTP security from port 465/);
  } finally {
    console.warn = originalWarn;
  }
});
