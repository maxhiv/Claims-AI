import { SMSProvider, SMSResult } from './types.js';
import { requestJSON, generateIdempotencyKey } from './http.js';

export class SMS77Provider implements SMSProvider {
  private apiKey: string;
  private baseUrl = 'https://gateway.sms77.io/api';

  constructor() {
    this.apiKey = process.env.SMS77IO_API_KEY || '';
    
    if (!this.apiKey) {
      throw new Error('SMS77IO_API_KEY environment variable is required');
    }
  }

  async sendSMS(to: string, message: string): Promise<SMSResult> {
    const url = `${this.baseUrl}/sms`;
    
    const payload = {
      to: to.replace(/\D/g, ''), // Remove non-digits
      text: message,
      from: process.env.SMS77IO_FROM || 'AI-Scheduler'
    };

    try {
      const response = await requestJSON(url, {
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        idempotencyKey: generateIdempotencyKey({ to, message })
      });

      // SMS77 returns different status codes based on success
      const success = response.statusCode === 200 && !response.body.error;
      
      return {
        success,
        messageId: response.body.id || undefined,
        cost: response.body.price || undefined,
        error: response.body.error || (!success ? 'SMS sending failed' : undefined)
      };
    } catch (error) {
      console.error('SMS77 error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown SMS77 error'
      };
    }
  }

  async getBalance(): Promise<{ success: boolean; balance?: number; error?: string }> {
    const url = `${this.baseUrl}/balance`;
    
    try {
      const response = await requestJSON(url, {
        headers: { 'X-API-Key': this.apiKey }
      });

      return {
        success: response.statusCode === 200,
        balance: response.body.balance || undefined,
        error: response.body.error || undefined
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Balance check failed'
      };
    }
  }
}