/**
 * Email service for sending transactional emails
 *
 * Uses Resend API for production email delivery.
 * Falls back to console logging in development/test environments.
 */

import { env } from "../config/env";
import { logger } from "../infrastructure/logger";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailService {
  sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string }>;
  sendMagicLink(email: string, token: string): Promise<{ success: boolean; messageId?: string }>;
}

class ResendEmailService implements EmailService {
  private readonly apiKey: string;
  private readonly from: string;

  constructor(apiKey: string, from: string) {
    this.apiKey = apiKey;
    this.from = from;
  }

  async sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string }> {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          from: this.from,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error({ to: options.to, error }, "Failed to send email via Resend");
        return { success: false };
      }

      const result = (await response.json()) as { id: string };
      logger.info({ to: options.to, messageId: result.id }, "Email sent successfully");
      return { success: true, messageId: result.id };
    } catch (err) {
      logger.error({ to: options.to, error: String(err) }, "Error sending email");
      return { success: false };
    }
  }

  async sendMagicLink(email: string, token: string): Promise<{ success: boolean; messageId?: string }> {
    const magicLinkUrl = `${process.env.APP_URL ?? "http://localhost:3000"}/verify?token=${token}`;

    return this.sendEmail({
      to: email,
      subject: "Sign in to Founder Toolkit",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Founder Toolkit</h1>
          <p>Click the button below to sign in to your account. This link will expire in 15 minutes.</p>
          <a href="${magicLinkUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
            Sign In
          </a>
          <p style="color: #666; font-size: 14px;">
            If you didn't request this email, you can safely ignore it.
          </p>
          <p style="color: #666; font-size: 12px;">
            Or copy this link: ${magicLinkUrl}
          </p>
        </div>
      `,
      text: `Sign in to Founder Toolkit\n\nClick this link to sign in: ${magicLinkUrl}\n\nThis link will expire in 15 minutes.`,
    });
  }
}

class MockEmailService implements EmailService {
  async sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string }> {
    const messageId = `mock-${Date.now()}`;
    logger.info(
      { to: options.to, subject: options.subject, messageId },
      "[MOCK EMAIL] Would send email"
    );
    console.log("\n========== MOCK EMAIL ==========");
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`---`);
    console.log(options.text ?? options.html.replace(/<[^>]*>/g, ""));
    console.log("================================\n");
    return { success: true, messageId };
  }

  async sendMagicLink(email: string, token: string): Promise<{ success: boolean; messageId?: string }> {
    const magicLinkUrl = `${process.env.APP_URL ?? "http://localhost:3000"}/verify?token=${token}`;
    return this.sendEmail({
      to: email,
      subject: "Sign in to Founder Toolkit",
      html: `<a href="${magicLinkUrl}">Sign In</a>`,
      text: `Sign in link: ${magicLinkUrl}`,
    });
  }
}

// Create the appropriate service based on environment
export const emailService: EmailService =
  env.RESEND_API_KEY
    ? new ResendEmailService(env.RESEND_API_KEY, env.EMAIL_FROM)
    : new MockEmailService();

// Log which email service is being used
if (env.RESEND_API_KEY) {
  logger.info({}, "Email service: Resend (production)");
} else {
  logger.info({}, "Email service: Mock (development mode - emails logged to console)");
}
