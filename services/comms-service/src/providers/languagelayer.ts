import { LanguageDetectionProvider, LanguageDetectionResult } from './types.js';
import { requestJSON } from './http.js';

export class LanguageLayerProvider implements LanguageDetectionProvider {
  private apiKey: string;
  private baseUrl = 'https://api.languagelayer.com/detect';

  constructor() {
    this.apiKey = process.env.LANGUAGELAYER_API_KEY || '';
    
    if (!this.apiKey) {
      throw new Error('LANGUAGELAYER_API_KEY environment variable is required');
    }
  }

  async detectLanguage(text: string): Promise<LanguageDetectionResult> {
    const url = `${this.baseUrl}?access_key=${this.apiKey}&query=${encodeURIComponent(text)}`;
    
    try {
      const response = await requestJSON(url, {
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.statusCode === 200 && response.body.success) {
        const detection = response.body.results[0];
        
        return {
          success: true,
          language: detection.language_code,
          confidence: detection.confidence
        };
      }

      return {
        success: false,
        error: response.body.error?.info || 'Language detection failed'
      };
    } catch (error) {
      console.error('LanguageLayer error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown LanguageLayer error'
      };
    }
  }
}