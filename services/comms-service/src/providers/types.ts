export interface EmailProvider {
  sendEmail(to: string, subject: string, content: string, templateId?: string): Promise<EmailResult>;
}

export interface SMSProvider {
  sendSMS(to: string, message: string): Promise<SMSResult>;
}

export interface WhatsAppProvider {
  sendWhatsApp(to: string, message: string): Promise<WhatsAppResult>;
}

export interface TranslationProvider {
  translateText(text: string, targetLanguage: string, sourceLanguage?: string): Promise<TranslationResult>;
}

export interface LanguageDetectionProvider {
  detectLanguage(text: string): Promise<LanguageDetectionResult>;
}

export interface PhoneValidationProvider {
  validatePhone(phoneNumber: string): Promise<PhoneValidationResult>;
}

export interface EmailValidationProvider {
  validateEmail(email: string): Promise<EmailValidationResult>;
}

// Result types
export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  cost?: number;
  error?: string;
}

export interface WhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface TranslationResult {
  success: boolean;
  translatedText?: string;
  detectedLanguage?: string;
  confidence?: number;
  error?: string;
}

export interface LanguageDetectionResult {
  success: boolean;
  language?: string;
  confidence?: number;
  error?: string;
}

export interface PhoneValidationResult {
  success: boolean;
  isValid?: boolean;
  formattedNumber?: string;
  country?: string;
  carrier?: string;
  error?: string;
}

export interface EmailValidationResult {
  success: boolean;
  isValid?: boolean;
  quality?: number;
  suggestion?: string;
  error?: string;
}

// Configuration types
export interface ProviderConfig {
  email: string;
  sms: string;
  whatsapp: string;
  translation: string;
  languageDetection: string;
  phoneValidation: string;
  emailValidation: string;
}