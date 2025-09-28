import { WhatsAppProvider, WhatsAppResult } from './types.js';
import { requestJSON, generateIdempotencyKey } from './http.js';

export class MaytApiProvider implements WhatsAppProvider {
  private apiKey: string;
  private phoneId: string;
  private baseUrl = 'https://api.maytapi.com/api';

  constructor() {
    this.apiKey = process.env.MAYTAPI_API_KEY || '';
    this.phoneId = process.env.MAYTAPI_PHONE_ID || '';
    
    if (!this.apiKey || !this.phoneId) {
      throw new Error('MAYTAPI_API_KEY and MAYTAPI_PHONE_ID environment variables are required');
    }
  }

  async sendWhatsApp(to: string, message: string): Promise<WhatsAppResult> {
    const url = `${this.baseUrl}/${this.phoneId}/sendMessage`;
    
    const payload = {
      to_number: to.replace(/\D/g, ''), // Remove non-digits
      message,
      type: 'text'
    };

    try {
      const response = await requestJSON(url, {
        headers: {
          'x-maytapi-key': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        idempotencyKey: generateIdempotencyKey({ to, message })
      });

      const success = response.statusCode === 200 && response.body.success;
      
      return {
        success,
        messageId: response.body.data?.id || undefined,
        error: response.body.error || (!success ? 'WhatsApp sending failed' : undefined)
      };
    } catch (error) {
      console.error('MaytApi error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown MaytApi error'
      };
    }
  }

  async getStatus(): Promise<{ success: boolean; status?: string; error?: string }> {
    const url = `${this.baseUrl}/${this.phoneId}/status`;
    
    try {
      const response = await requestJSON(url, {
        headers: { 'x-maytapi-key': this.apiKey }
      });

      return {
        success: response.statusCode === 200,
        status: response.body.data?.status || undefined,
        error: response.body.error || undefined
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Status check failed'
      };
    }
  }
}