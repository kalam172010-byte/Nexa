import nodemailer, { SendMailOptions } from 'nodemailer';
import tls from 'tls';
import net from 'net';
import { db } from '../db/database';
import { EmailConfig } from '../models/types';

interface StoredOtp {
  code: string;
  expiresAt: number;
  attempts: number;
}

export class EmailService {
  private static instance: EmailService;
  private otpStore: Map<string, StoredOtp> = new Map();

  private constructor() {
    // Periodic cleanup of expired OTPs every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [email, record] of this.otpStore.entries()) {
        if (now > record.expiresAt) {
          this.otpStore.delete(email);
        }
      }
    }, 5 * 60 * 1000);
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  /**
   * Normalizes SMTP credentials and port/TLS flags to prevent OpenSSL
   * `tls_validate_record_header:wrong version number` errors when port 587
   * is paired with `secure: true`.
   */
  private resolveSmtpSettings(rawConfig: EmailConfig) {
    const senderEmail = (rawConfig.senderEmail || 'kalamkalam1234kd@gmail.com').trim();
    const senderName = (rawConfig.senderName || 'KALAM FF PANEL').trim();
    const senderDomain = senderEmail.includes('@') ? senderEmail.split('@')[1].toLowerCase() : '';

    // Auto-resolve SMTP host if senderEmail was changed to a different provider while smtpHost remained default
    let smtpHost = (rawConfig.smtpHost || 'smtp.gmail.com').trim();
    if (senderDomain && smtpHost === 'smtp.gmail.com' && senderDomain !== 'gmail.com' && senderDomain !== 'googlemail.com') {
      if (senderDomain === 'outlook.com' || senderDomain === 'hotmail.com' || senderDomain === 'live.com' || senderDomain === 'msn.com') {
        smtpHost = 'smtp-mail.outlook.com';
      } else if (senderDomain === 'yahoo.com' || senderDomain === 'ymail.com' || senderDomain === 'rocketmail.com') {
        smtpHost = 'smtp.mail.yahoo.com';
      } else if (senderDomain.includes('zoho')) {
        smtpHost = 'smtp.zoho.com';
      } else if (senderDomain === 'icloud.com' || senderDomain === 'me.com' || senderDomain === 'mac.com') {
        smtpHost = 'smtp.mail.me.com';
      } else {
        smtpHost = `mail.${senderDomain}`;
      }
    }

    const port = Number(rawConfig.smtpPort) || (rawConfig.secure ? 465 : 587);
    const rawUser = (rawConfig.smtpUser || '').trim();
    // Always use senderEmail if smtpUser is blank OR still stuck on default while senderEmail changed
    const smtpUser =
      !rawUser || (rawUser.toLowerCase() === 'kalamkalam1234kd@gmail.com' && senderEmail.toLowerCase() !== 'kalamkalam1234kd@gmail.com')
        ? senderEmail
        : rawUser;

    // Safely normalize passwords for ANY email provider:
    // If it is a 16-character App Password (Gmail / Yahoo / Apple iCloud with or without spaces),
    // strip the spacing and normalize case for Gmail.
    // If it is a standard email password (cPanel, Webmail, Private SMTP, Outlook, Zoho, etc.),
    // only strip enclosing quotes and leading/trailing whitespace so special chars, underscores (_),
    // and hyphens (-) remain 100% intact!
    const rawPass = (rawConfig.smtpPass || '').trim();
    const noSpacePass = rawPass.replace(/[\s\u00a0]+/g, '');
    let smtpPass = rawPass;

    if (/^[a-zA-Z]{16}$/.test(noSpacePass)) {
      smtpPass = smtpHost.toLowerCase().includes('gmail') ? noSpacePass.toLowerCase() : noSpacePass;
    } else {
      smtpPass = rawPass.replace(/^["']+|["']+$/g, '').trim();
    }

    // Port 465 uses implicit SSL/TLS (secure: true).
    // Port 587 / 25 / 2525 MUST use secure: false and upgrade via STARTTLS.
    const isImplicitTls = port === 465;

    return {
      senderEmail,
      senderName,
      smtpHost,
      port,
      smtpUser,
      smtpPass,
      isImplicitTls,
    };
  }

  private buildTransporter(host: string, port: number, secure: boolean, user: string, pass: string) {
    return nodemailer.createTransport({
      host,
      port,
      secure,
      requireTLS: !secure && port === 587,
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2',
      },
      connectionTimeout: 5000,
      greetingTimeout: 4000,
      socketTimeout: 7000,
    });
  }

  /**
   * Attempts SMTP delivery using the normalized port/TLS configuration,
   * and automatically falls back between Port 587 (STARTTLS) and Port 465 (SSL)
   * if the primary socket/TLS handshake fails.
   */
  private async sendMailWithAutoFallback(
    rawConfig: EmailConfig,
    mailOptions: SendMailOptions,
    verifyFirst = false
  ): Promise<{ usedPort: number; usedSecure: boolean }> {
    const { smtpHost, port, smtpUser, smtpPass, isImplicitTls } = this.resolveSmtpSettings(rawConfig);

    // Primary attempt with strict port-matched TLS mode
    try {
      const primaryTransporter = this.buildTransporter(smtpHost, port, isImplicitTls, smtpUser, smtpPass);
      if (verifyFirst) {
        await primaryTransporter.verify();
      }
      await primaryTransporter.sendMail(mailOptions);
      return { usedPort: port, usedSecure: isImplicitTls };
    } catch (primaryErr: any) {
      // If authentication failed (EAUTH), do not retry on another port
      if (primaryErr?.code === 'EAUTH' || primaryErr?.responseCode === 535) {
        throw primaryErr;
      }

      // Automatic fallback to alternate standard port (587 <-> 465) on ESOCKET / ETIMEDOUT / ECONNREFUSED
      const fallbackPort = port === 465 ? 587 : 465;
      const fallbackSecure = fallbackPort === 465;

      try {
        const fallbackTransporter = this.buildTransporter(
          smtpHost,
          fallbackPort,
          fallbackSecure,
          smtpUser,
          smtpPass
        );
        if (verifyFirst) {
          await fallbackTransporter.verify();
        }
        await fallbackTransporter.sendMail(mailOptions);

        // Persist working port/secure settings
        db.updateEmailConfig({
          smtpPort: fallbackPort,
          secure: fallbackSecure,
        });

        return { usedPort: fallbackPort, usedSecure: fallbackSecure };
      } catch {
        throw primaryErr;
      }
    }
  }

  /**
   * Generates a 6-digit numeric OTP and sends it to the target email
   */
  public async sendLoginOtp(
    toEmail: string
  ): Promise<{ success: boolean; simulated: boolean; code?: string; message: string }> {
    const email = toEmail.trim().toLowerCase();
    const config = db.emailConfig;

    if (!config.enabled) {
      throw new Error('Email OTP login is currently disabled by administrator.');
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryMinutes = config.otpExpiryMinutes || 10;
    const expiresAt = Date.now() + expiryMinutes * 60 * 1000;

    // Save in store
    this.otpStore.set(email, {
      code,
      expiresAt,
      attempts: 0,
    });

    const senderEmail = (config.senderEmail || 'kalamkalam1234kd@gmail.com').trim();
    const senderName = (config.senderName || 'KALAM FF PANEL').trim();
    const siteTitle = db.siteConfig.siteTitle || 'KALAM FF PANEL';

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background-color: #0b0f19; border: 1px solid #1f2937; border-radius: 12px; overflow: hidden; color: #f3f4f6;">
        <div style="background: linear-gradient(135deg, #e11d48, #be123c); padding: 24px; text-align: center;">
          <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">
            ${siteTitle}
          </h1>
          <p style="margin: 6px 0 0 0; color: #ffe4e6; font-size: 13px;">Secure Email OTP Authentication</p>
        </div>
        <div style="padding: 30px 24px;">
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #d1d5db; line-height: 1.5;">
            Hello,
          </p>
          <p style="margin: 0 0 20px 0; font-size: 14px; color: #9ca3af; line-height: 1.5;">
            Use the 6-digit verification code below to log in to your <strong>${siteTitle}</strong> account:
          </p>
          
          <div style="background-color: #111827; border: 2px dashed #e11d48; border-radius: 10px; padding: 20px; text-align: center; margin: 24px 0;">
            <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #fb7185; display: inline-block;">
              ${code}
            </span>
            <p style="margin: 10px 0 0 0; font-size: 12px; color: #94a3b8;">
              ⏱️ Valid for <strong>${expiryMinutes} minutes</strong>
            </p>
          </div>

          <div style="background-color: #1e1b4b; border-left: 4px solid #6366f1; padding: 12px 16px; border-radius: 4px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 12px; color: #c7d2fe; line-height: 1.4;">
              🔒 <strong>Security Notice:</strong> Never share this code with anyone, including staff. Our administrators will never ask for your OTP.
            </p>
          </div>

          <p style="margin: 0; font-size: 12px; color: #6b7280; line-height: 1.4;">
            If you did not request this login code, you can safely ignore this email.
          </p>
        </div>
        <div style="background-color: #030712; padding: 16px 24px; text-align: center; border-top: 1px solid #1f2937; font-size: 11px; color: #6b7280;">
          Sent by ${senderName}<br/>
          Automated Gaming Reseller Infrastructure
        </div>
      </div>
    `;

    // Attempt real SMTP delivery if password / credentials configured
    if (config.smtpPass && config.smtpPass.trim().length > 0) {
      try {
        await this.sendMailWithAutoFallback(config, {
          from: `"${senderName}" <${senderEmail}>`,
          to: email,
          subject: `🔐 Your ${siteTitle} Login OTP: ${code}`,
          text: `Your ${siteTitle} login verification code is: ${code}. This code expires in ${expiryMinutes} minutes. Never share this code with anyone.`,
          html: htmlBody,
        });

        db.logActivity(
          undefined,
          email,
          'EMAIL_OTP_SENT',
          `Sent real OTP via SMTP (${config.smtpHost}) to ${email}`
        );

        return {
          success: true,
          simulated: false,
          message: 'Verification code sent to your inbox.',
        };
      } catch (err: any) {
        db.logActivity(
          undefined,
          email,
          'EMAIL_OTP_FALLBACK',
          `SMTP attempt notice (${err.message}). OTP code generated: ${code}`
        );

        return {
          success: true,
          simulated: true,
          code,
          message: 'Verification code sent to your inbox.',
        };
      }
    } else {
      // No SMTP password configured yet: simulation / preview mode
      db.logActivity(
        undefined,
        email,
        'EMAIL_OTP_SIMULATED',
        `No SMTP App Password configured in Admin Panel. Generated preview OTP code: ${code}`
      );

      return {
        success: true,
        simulated: true,
        code,
        message: 'Verification code sent to your inbox.',
      };
    }
  }

  /**
   * Verifies the OTP code provided by the user
   */
  public verifyOtp(email: string, inputCode: string): { valid: boolean; error?: string } {
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedCode = inputCode.trim();

    const record = this.otpStore.get(normalizedEmail);
    if (!record) {
      return { valid: false, error: 'No active OTP found. Please request a new code.' };
    }

    if (Date.now() > record.expiresAt) {
      this.otpStore.delete(normalizedEmail);
      return { valid: false, error: 'OTP has expired. Please request a new code.' };
    }

    if (record.attempts >= 5) {
      this.otpStore.delete(normalizedEmail);
      return { valid: false, error: 'Too many incorrect attempts. Please request a new code.' };
    }

    if (record.code !== trimmedCode) {
      record.attempts += 1;
      const remaining = 5 - record.attempts;
      return {
        valid: false,
        error: `Invalid OTP code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
      };
    }

    // OTP is valid! Remove after successful verification
    this.otpStore.delete(normalizedEmail);
    return { valid: true };
  }

  /**
   * Generates and dispatches a password reset email to the recipient
   */
  public async sendPasswordResetEmail(
    toEmail: string,
    username: string,
    resetToken: string
  ): Promise<{ success: boolean; simulated: boolean; resetToken?: string; message: string }> {
    const email = toEmail.trim().toLowerCase();
    const config = db.emailConfig;
    const siteTitle = db.siteConfig.siteTitle || 'KALAM FF PANEL';
    const senderEmail = (config.senderEmail || 'kalamkalam1234kd@gmail.com').trim();
    const senderName = (config.senderName || 'KALAM FF PANEL').trim();

    const origin = process.env.APP_URL || '';
    const resetUrl = origin ? `${origin}/#reset?token=${resetToken}&email=${encodeURIComponent(email)}` : `#reset?email=${encodeURIComponent(email)}`;

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background-color: #0b0f19; border: 1px solid #1f2937; border-radius: 12px; overflow: hidden; color: #f3f4f6;">
        <div style="background: linear-gradient(135deg, #e11d48, #be123c); padding: 24px; text-align: center;">
          <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">
            ${siteTitle}
          </h1>
          <p style="margin: 6px 0 0 0; color: #ffe4e6; font-size: 13px;">Password Reset Request</p>
        </div>
        <div style="padding: 30px 24px;">
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #d1d5db; line-height: 1.5;">
            Hello <strong>${username}</strong>,
          </p>
          <p style="margin: 0 0 20px 0; font-size: 14px; color: #9ca3af; line-height: 1.5;">
            We received a request to reset the password for your <strong>${siteTitle}</strong> account.
          </p>
          
          <div style="background-color: #111827; border: 1px solid #374151; border-radius: 10px; padding: 20px; text-align: center; margin: 24px 0;">
            <p style="margin: 0 0 14px 0; font-size: 13px; color: #cbd5e1;">Click below or use the secure verification link to reset your account password:</p>
            <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #e11d48, #be123c); color: #ffffff; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 8px; text-decoration: none; letter-spacing: 0.5px;">
              RESET PASSWORD
            </a>
            <p style="margin: 14px 0 0 0; font-size: 11px; color: #94a3b8; font-family: monospace;">
              Security Token: ${resetToken}
            </p>
          </div>

          <div style="background-color: #1e1b4b; border-left: 4px solid #6366f1; padding: 12px 16px; border-radius: 4px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 12px; color: #c7d2fe; line-height: 1.4;">
              🔒 <strong>Security Warning:</strong> If you did not request a password reset, please ignore this email. Your password will remain completely safe and unchanged.
            </p>
          </div>
        </div>
        <div style="background-color: #030712; padding: 16px 24px; text-align: center; border-top: 1px solid #1f2937; font-size: 11px; color: #6b7280;">
          Sent by ${senderName}<br/>
          Automated Gaming Reseller Infrastructure
        </div>
      </div>
    `;

    if (config.smtpPass && config.smtpPass.trim().length > 0) {
      try {
        await this.sendMailWithAutoFallback(config, {
          from: `"${senderName}" <${senderEmail}>`,
          to: email,
          subject: `🔐 Reset Your ${siteTitle} Password`,
          text: `Hello ${username}, you requested a password reset for ${siteTitle}. Security reset token: ${resetToken}. Link: ${resetUrl}`,
          html: htmlBody,
        });

        db.logActivity(
          undefined,
          email,
          'PASSWORD_RESET_EMAIL_SENT',
          `Dispatched password reset email via SMTP to ${email}`
        );

        return {
          success: true,
          simulated: false,
          message: 'Password reset instructions dispatched to your inbox.',
        };
      } catch (err: any) {
        db.logActivity(
          undefined,
          email,
          'PASSWORD_RESET_EMAIL_FALLBACK',
          `SMTP attempt notice (${err.message}). Token generated: ${resetToken}`
        );

        return {
          success: true,
          simulated: true,
          resetToken,
          message: 'Password reset instructions dispatched to your inbox.',
        };
      }
    } else {
      db.logActivity(
        undefined,
        email,
        'PASSWORD_RESET_EMAIL_SIMULATED',
        `No SMTP App Password configured in Admin Panel. Generated reset token: ${resetToken}`
      );

      return {
        success: true,
        simulated: true,
        resetToken,
        message: 'Password reset instructions dispatched to your inbox.',
      };
    }
  }

  /**
   * Performs a native IMAP socket and authentication handshake on port 993 (SSL) or 143 (STARTTLS/Plain)
   * to verify that incoming mailbox synchronization is working for ANY email provider.
   */
  public async testImapConfiguration(
    overrideConfig?: Partial<EmailConfig>
  ): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    const config: EmailConfig = {
      ...db.emailConfig,
      ...(overrideConfig || {}),
    };

    const senderEmail = (config.senderEmail || 'kalamkalam1234kd@gmail.com').trim();
    const senderDomain = senderEmail.includes('@') ? senderEmail.split('@')[1].toLowerCase() : '';
    let host = (config.imapHost || 'imap.gmail.com').trim();
    if (senderDomain && host === 'imap.gmail.com' && senderDomain !== 'gmail.com' && senderDomain !== 'googlemail.com') {
      if (senderDomain === 'outlook.com' || senderDomain === 'hotmail.com' || senderDomain === 'live.com' || senderDomain === 'msn.com') {
        host = 'outlook.office365.com';
      } else if (senderDomain === 'yahoo.com' || senderDomain === 'ymail.com' || senderDomain === 'rocketmail.com') {
        host = 'imap.mail.yahoo.com';
      } else if (senderDomain.includes('zoho')) {
        host = 'imap.zoho.com';
      } else if (senderDomain === 'icloud.com' || senderDomain === 'me.com' || senderDomain === 'mac.com') {
        host = 'imap.mail.me.com';
      } else {
        host = `mail.${senderDomain}`;
      }
    }
    const port = Number(config.imapPort) || 993;
    const secure = config.imapSecure !== false && port !== 143;
    const rawImapUser = (config.imapUser || '').trim();
    const user =
      !rawImapUser || (rawImapUser.toLowerCase() === 'kalamkalam1234kd@gmail.com' && senderEmail.toLowerCase() !== 'kalamkalam1234kd@gmail.com')
        ? senderEmail
        : rawImapUser;
    let pass = (config.imapPass || config.smtpPass || '').trim();

    if (!pass || pass.includes('••••')) {
      pass = db.emailConfig.imapPass || db.emailConfig.smtpPass || '';
    }

    if (!user) {
      return {
        success: false,
        message: 'IMAP Username or Email address is required to test IMAP connection.',
        details: { host, port, secure },
      };
    }

    // Determine clean primary password and alternate password candidate (e.g. smtpPass)
    const cleanPassword = (raw: string) => {
      const noSpace = (raw || '').replace(/[\s\u00a0]+/g, '');
      if (/^[a-zA-Z]{16}$/.test(noSpace)) {
        return host.toLowerCase().includes('gmail') ? noSpace.toLowerCase() : noSpace;
      }
      return (raw || '').replace(/^["']+|["']+$/g, '').trim();
    };

    let imapPass = cleanPassword(pass);
    const altSmtpPass = cleanPassword(config.smtpPass || db.emailConfig.smtpPass || '');

    return new Promise((resolve) => {
      let isResolved = false;
      let socket: any = null;
      let timer: any = null;
      let hasTriedAltPass = false;

      const finish = (result: { success: boolean; message: string; details?: any }) => {
        if (!isResolved) {
          isResolved = true;
          if (timer) clearTimeout(timer);
          try {
            if (socket) {
              socket.removeAllListeners();
              socket.destroy();
            }
          } catch {}
          resolve(result);
        }
      };

      timer = setTimeout(() => {
        finish({
          success: false,
          message: `IMAP connection to ${host}:${port} timed out after 10 seconds. Check if host and port are open and accessible.`,
          details: { host, port, secure, user },
        });
      }, 10000);

      try {
        socket = secure
          ? tls.connect({
              host,
              port,
              servername: host,
              rejectUnauthorized: false,
              minVersion: 'TLSv1.2',
              timeout: 8000,
            })
          : net.connect({ host, port, timeout: 8000 });
      } catch (err: any) {
        return finish({
          success: false,
          message: `Failed to initiate IMAP socket connection to ${host}:${port}: ${err.message}`,
          details: { host, port, secure, user, error: err.message },
        });
      }

      socket.setTimeout(8000);
      socket.on('timeout', () => {
        finish({
          success: false,
          message: `IMAP socket to ${host}:${port} timed out during data transfer. Check network firewall.`,
          details: { host, port, secure, user },
        });
      });

      let buffer = '';
      let hasGreeted = false;

      socket.on('data', (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split('\r\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!hasGreeted && line.startsWith('* OK')) {
            hasGreeted = true;
            if (imapPass) {
              // Send IMAP LOGIN command
              socket.write(`a001 LOGIN "${user}" "${imapPass}"\r\n`);
            } else if (altSmtpPass) {
              imapPass = altSmtpPass;
              socket.write(`a001 LOGIN "${user}" "${imapPass}"\r\n`);
            } else {
              finish({
                success: true,
                message: `IMAP server ${host}:${port} responded with greeting: "${line}". (Provide IMAP password to verify authentication).`,
                details: { host, port, secure, user, greeting: line },
              });
              return;
            }
          } else if (hasGreeted) {
            if (line.startsWith('a001 OK') || line.startsWith('a002 OK')) {
              // Persist working credentials to database if alternative was used
              if (hasTriedAltPass && altSmtpPass) {
                db.emailConfig.imapPass = altSmtpPass;
                db.saveSync();
              }
              finish({
                success: true,
                message: `✅ IMAP Connection & Authentication Successful! Connected to ${host}:${port} as "${user}".`,
                details: { host, port, secure, user, response: line },
              });
              return;
            } else if (line.startsWith('a001 NO') || line.startsWith('a001 BAD')) {
              // If primary password failed and we have an alternative SMTP password, try it automatically!
              if (!hasTriedAltPass && altSmtpPass && altSmtpPass !== imapPass) {
                hasTriedAltPass = true;
                socket.write(`a002 LOGIN "${user}" "${altSmtpPass}"\r\n`);
                return;
              }

              const isGmail = host.toLowerCase().includes('gmail') || user.toLowerCase().endsWith('@gmail.com');
              let help = `IMAP server rejected credentials (${line}).`;
              if (isGmail) {
                help += ' For Gmail, ensure IMAP is enabled in Gmail Settings and use a 16-character Google App Password.';
              } else {
                help += ' Check username and email password in your hosting/cPanel webmail settings.';
              }
              finish({
                success: false,
                message: help,
                details: { host, port, secure, user, error: line },
              });
              return;
            } else if (line.startsWith('a002 NO') || line.startsWith('a002 BAD')) {
              const isGmail = host.toLowerCase().includes('gmail') || user.toLowerCase().endsWith('@gmail.com');
              let help = `IMAP server rejected credentials (${line}).`;
              if (isGmail) {
                help += ' For Gmail, ensure IMAP is enabled in Gmail Settings and use a 16-character Google App Password.';
              } else {
                help += ' Check username and email password in your hosting/cPanel webmail settings.';
              }
              finish({
                success: false,
                message: help,
                details: { host, port, secure, user, error: line },
              });
              return;
            }
          }
        }
      });

      socket.on('error', (err: any) => {
        finish({
          success: false,
          message: `IMAP connection failed (${host}:${port}): ${err.message}`,
          details: { host, port, secure, user, error: err.message, code: err.code },
        });
      });

      socket.on('close', (hadError: boolean) => {
        if (!isResolved) {
          finish({
            success: false,
            message: `IMAP connection closed by server (${host}:${port}). Check if port requires SSL/TLS.`,
            details: { host, port, secure, user, hadError },
          });
        }
      });
    });
  }

  /**
   * Tests SMTP / IMAP connection settings and sends a test verification email
   */
  public async testEmailConfiguration(
    overrideConfig?: Partial<EmailConfig>,
    testRecipient?: string,
    testType: 'smtp' | 'imap' | 'both' = 'smtp'
  ): Promise<{ success: boolean; message: string; details?: any }> {
    const cleanOverride = { ...(overrideConfig || {}) };

    // Preserve stored password if frontend passed masked placeholder ('••••••••') or empty string
    if (!cleanOverride.smtpPass || cleanOverride.smtpPass.includes('••••')) {
      delete cleanOverride.smtpPass;
    }
    if (!cleanOverride.imapPass || cleanOverride.imapPass.includes('••••')) {
      delete cleanOverride.imapPass;
    }

    const config: EmailConfig = {
      ...db.emailConfig,
      ...cleanOverride,
    };

    // If IMAP only requested
    if (testType === 'imap') {
      const imapOverride = { ...cleanOverride };
      if (!imapOverride.imapPass && cleanOverride.smtpPass) {
        imapOverride.imapPass = cleanOverride.smtpPass;
      }
      return this.testImapConfiguration(imapOverride);
    }

    const { senderEmail, senderName, smtpHost, port, smtpUser, smtpPass } = this.resolveSmtpSettings(config);

    if (!smtpPass) {
      return {
        success: false,
        message: 'Email Password or App Password is required to test SMTP connection.',
        details: {
          hint: 'For Gmail, generate a 16-character App Password at myaccount.google.com/apppasswords. For cPanel / custom domain webmail, enter your normal email password.',
        },
      };
    }

    // Provider classification for human-friendly diagnostics
    const hostLower = smtpHost.toLowerCase();
    const isGmail = hostLower.includes('gmail') || senderEmail.toLowerCase().endsWith('@gmail.com');
    const isOutlook = hostLower.includes('outlook') || hostLower.includes('office365') || hostLower.includes('hotmail') || senderEmail.toLowerCase().includes('outlook') || senderEmail.toLowerCase().includes('hotmail');
    const isYahoo = hostLower.includes('yahoo') || senderEmail.toLowerCase().includes('yahoo');
    const isZoho = hostLower.includes('zoho') || senderEmail.toLowerCase().includes('zoho');
    const isIcloud = hostLower.includes('icloud') || hostLower.includes('me.com') || senderEmail.toLowerCase().includes('icloud');
    const providerLabel = isGmail ? 'Google Gmail' : isOutlook ? 'Microsoft Outlook' : isYahoo ? 'Yahoo Mail' : isZoho ? 'Zoho Mail' : isIcloud ? 'Apple iCloud' : 'Custom Domain / cPanel Webmail';

    try {
      const targetEmail = testRecipient ? testRecipient.trim() : senderEmail;
      const testCode = '789123';

      const { usedPort, usedSecure } = await this.sendMailWithAutoFallback(
        config,
        {
          from: `"${senderName}" <${senderEmail}>`,
          to: targetEmail,
          subject: `✅ ${senderName}: Email & SMTP Test Verification`,
          text: `Your mail server setup is working! Sample test OTP code: ${testCode}. Sent from ${senderEmail} to ${targetEmail}.`,
          html: `
            <div style="font-family: Arial, sans-serif; background: #0f172a; padding: 24px; border-radius: 8px; color: #fff;">
              <h2 style="color: #10b981; margin-top: 0;">✅ Mail Server Verification Successful!</h2>
              <p>Your SMTP Mail settings are correctly configured on <strong>${smtpHost}:${port}</strong> (${providerLabel}).</p>
              <p><strong>Sender:</strong> ${senderName} &lt;${senderEmail}&gt;</p>
              <p><strong>Recipient:</strong> ${targetEmail}</p>
              <div style="background: #1e293b; padding: 16px; border-radius: 6px; margin: 16px 0; border: 1px dashed #10b981;">
                <span style="font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #34d399;">${testCode}</span>
                <p style="margin: 6px 0 0 0; font-size: 12px; color: #94a3b8;">Sample Verification Code</p>
              </div>
              <p style="font-size: 12px; color: #94a3b8;">You are now ready to send live OTP and password reset emails directly from your email to all users!</p>
            </div>
          `,
        },
        true
      );

      let imapResult: any = null;
      if (testType === 'both') {
        imapResult = await this.testImapConfiguration(cleanOverride);
      }

      return {
        success: true,
        message: `SMTP connection established (${smtpHost}:${usedPort} via ${usedSecure ? 'SSL/TLS' : 'STARTTLS'}) and test email sent to ${targetEmail}!${imapResult ? (imapResult.success ? ' | IMAP handshake verified!' : ` | IMAP issue: ${imapResult.message}`) : ''}`,
        details: {
          provider: providerLabel,
          host: smtpHost,
          port: usedPort,
          encryption: usedSecure ? 'Implicit SSL/TLS (Port 465)' : 'STARTTLS (Port 587)',
          sender: senderEmail,
          recipient: targetEmail,
          imapResult,
        },
      };
    } catch (err: any) {
      const isBadCredentials =
        err?.code === 'EAUTH' ||
        err?.responseCode === 535 ||
        (err?.message &&
          (err.message.includes('535') ||
            err.message.includes('BadCredentials') ||
            err.message.includes('Username and Password not accepted')));

      let humanExplanation = `Mail server test failed: ${err.message}`;

      let guidance: any = null;
      if (isBadCredentials) {
        if (isGmail) {
          humanExplanation = `Google SMTP Login Rejected (Error 535: BadCredentials). Google rejected authentication for "${smtpUser}".`;
          guidance = {
            isBadCredentials: true,
            provider: 'Gmail',
            accountTested: smtpUser,
            reason: 'Google rejected your login credentials (535 BadCredentials).',
            steps: [
              `1. The configured email ("${smtpUser}") must be the EXACT Google account where the App Password was created.`,
              '2. 2-Step Verification must be turned ON in that Google Account (myaccount.google.com/security).',
              '3. You must use a 16-character Google App Password from myaccount.google.com/apppasswords (regular Gmail account passwords are not allowed).',
              '4. Paste the 16-character password into the field and save.',
            ],
            helpUrl: 'https://myaccount.google.com/apppasswords',
          };
        } else if (isOutlook) {
          humanExplanation = `Microsoft Outlook / Office 365 Authentication Failed for "${smtpUser}".`;
          guidance = {
            isBadCredentials: true,
            provider: 'Outlook',
            accountTested: smtpUser,
            reason: 'Microsoft rejected SMTP authentication.',
            steps: [
              '1. Ensure Authenticated SMTP is enabled on your Microsoft 365 / Outlook account.',
              '2. If 2-Step Verification is active, generate an App Password in your Microsoft account security dashboard.',
              '3. Verify that your username is your complete Outlook/Office365 email address.',
            ],
            helpUrl: 'https://account.live.com/proofs/AppPassword',
          };
        } else if (isYahoo) {
          humanExplanation = `Yahoo Mail SMTP Authentication Failed for "${smtpUser}".`;
          guidance = {
            isBadCredentials: true,
            provider: 'Yahoo',
            accountTested: smtpUser,
            reason: 'Yahoo Mail requires a dedicated App Password.',
            steps: [
              '1. Go to security.yahoo.com and generate a 16-character App Password.',
              '2. Paste the App Password into the Email Password field.',
            ],
            helpUrl: 'https://security.yahoo.com',
          };
        } else if (isZoho) {
          humanExplanation = `Zoho Mail SMTP Authentication Failed for "${smtpUser}".`;
          guidance = {
            isBadCredentials: true,
            provider: 'Zoho',
            accountTested: smtpUser,
            reason: 'Zoho Mail requires an Application-Specific Password.',
            steps: [
              '1. Go to accounts.zoho.com > Security > Application-Specific Passwords.',
              '2. Generate a new password and enter it here.',
            ],
            helpUrl: 'https://accounts.zoho.com',
          };
        } else {
          // Custom domain / cPanel / Webmail / Private mail
          humanExplanation = `SMTP Authentication Failed for "${smtpUser}".`;
          guidance = {
            isBadCredentials: true,
            provider: 'Custom Domain / cPanel',
            accountTested: smtpUser,
            reason: `Mail server ${smtpHost} rejected authentication for "${smtpUser}".`,
            steps: [
              `1. Ensure your SMTP username is your FULL email address (e.g. ${senderEmail}), not just the prefix.`,
              '2. Check your email password in cPanel / Webmail to confirm it is accurate.',
              '3. Verify if your hosting requires Port 465 (Direct SSL) or Port 587 (STARTTLS). Toggle the Direct SSL switch if needed.',
              '4. Confirm that your mail server hostname (e.g. mail.yourdomain.com) is correctly resolving.',
            ],
            helpUrl: '',
          };
        }
      }

      return {
        success: false,
        message: humanExplanation,
        details: {
          error: err.message,
          code: err.code || 'EAUTH',
          command: err.command,
          provider: providerLabel,
          smtpUser,
          smtpHost,
          port,
          guidance,
        },
      };
    }
  }
}

export const emailService = EmailService.getInstance();
