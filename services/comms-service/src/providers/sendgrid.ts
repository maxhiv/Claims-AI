import sgMail from '@sendgrid/mail';
import { EmailProvider, EmailResult } from './types.js';
import { requestJSON, generateIdempotencyKey } from './http.js';

export class SendGridProvider implements EmailProvider {
  private apiKey: string;
  private fromEmail: string;

  constructor() {
    this.apiKey = process.env.SENDGRID_API_KEY || '';
    this.fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@ai-scheduler.com';
    
    if (!this.apiKey) {
      throw new Error('SENDGRID_API_KEY environment variable is required');
    }
    
    sgMail.setApiKey(this.apiKey);
  }

  async sendEmail(to: string, subject: string, content: string, templateId?: string): Promise<EmailResult> {
    try {
      const message = {
        to,
        from: this.fromEmail,
        subject,
        html: content,
        ...(templateId && { templateId })
      };

      const [response] = await sgMail.send(message);
      
      return {
        success: true,
        messageId: response.headers['x-message-id'] as string || undefined
      };
    } catch (error) {
      console.error('SendGrid email error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown SendGrid error'
      };
    }
  }

  // Alternative implementation using direct HTTP calls
  async sendEmailHTTP(to: string, subject: string, content: string, templateId?: string): Promise<EmailResult> {
    const url = 'https://api.sendgrid.com/v3/mail/send';
    
    const payload = {
      personalizations: [{
        to: [{ email: to }],
        subject
      }],
      from: { email: this.fromEmail },
      content: [{ type: 'text/html', value: content }],
      ...(templateId && { template_id: templateId })
    };

    try {
      const response = await requestJSON(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        idempotencyKey: generateIdempotencyKey({ to, subject, content })
      });

      return {
        success: response.statusCode === 202,
        messageId: response.headers['x-message-id'] || undefined
      };
    } catch (error) {
      console.error('SendGrid HTTP error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown HTTP error'
      };
    }
  }
}