import { Resend } from 'resend';
import { env } from '../config/env';

const resend = new Resend(env.RESEND_API_KEY);

async function send(to: string, subject: string, html: string): Promise<void> {
  const { error } = await resend.emails.send({ from: env.FROM_EMAIL, to, subject, html });
  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

export async function sendPasswordResetEmail(
  toEmail: string,
  name: string,
  resetLink: string,
): Promise<void> {
  await send(
    toEmail,
    'Reset your password',
    `
      <p>Hi ${name},</p>
      <p>You requested a password reset. Click the link below to reset your password. This link expires in 1 hour.</p>
      <p><a href="${resetLink}">Reset Password</a></p>
      <p>If you didn't request this, you can ignore this email.</p>
    `,
  );
}

export async function sendEmailVerificationOtp(
  toEmail: string,
  name: string,
  otp: string,
): Promise<void> {
  await send(
    toEmail,
    'Verify your email address',
    `
      <p>Hi ${name},</p>
      <p>Your email verification code is:</p>
      <h2 style="letter-spacing: 4px;">${otp}</h2>
      <p>This code expires in 10 minutes.</p>
      <p>If you didn't request this, you can ignore this email.</p>
    `,
  );
}
