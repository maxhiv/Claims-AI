import { SendGridProvider } from './sendgrid.js';
import { SMS77Provider } from './sms77io.js';
import { MaytApiProvider } from './maytapi.js';
import { LanguageLayerProvider } from './languagelayer.js';
import { 
  EmailProvider, 
  SMSProvider, 
  WhatsAppProvider, 
  LanguageDetectionProvider,
  ProviderConfig 
} from './types.js';

// Provider registry
const providers = {
  email: {
    sendgrid: () => new SendGridProvider()
  },
  sms: {
    sms77io: () => new SMS77Provider()
  },
  whatsapp: {
    maytapi: () => new MaytApiProvider()
  },
  languageDetection: {
    languagelayer: () => new LanguageLayerProvider()
  }
};

// Provider configuration from environment
export const config: ProviderConfig = {
  email: process.env.COMMS_EMAIL_PROVIDER || 'sendgrid',
  sms: process.env.COMMS_SMS_PROVIDER || 'sms77io',
  whatsapp: process.env.COMMS_WHATSAPP_PROVIDER || 'maytapi',
  translation: process.env.COMMS_TRANSLATION_PROVIDER || 'openai',
  languageDetection: process.env.COMMS_LANGUAGE_DETECTION_PROVIDER || 'languagelayer',
  phoneValidation: process.env.COMMS_PHONE_VALIDATION_PROVIDER || 'abstract',
  emailValidation: process.env.COMMS_EMAIL_VALIDATION_PROVIDER || 'abstract'
};

// Provider selectors
export function getEmailProvider(): EmailProvider {
  const providerName = config.email;
  const providerFactory = providers.email[providerName as keyof typeof providers.email];
  
  if (!providerFactory) {
    throw new Error(`Unknown email provider: ${providerName}`);
  }
  
  return providerFactory();
}

export function getSMSProvider(): SMSProvider {
  const providerName = config.sms;
  const providerFactory = providers.sms[providerName as keyof typeof providers.sms];
  
  if (!providerFactory) {
    throw new Error(`Unknown SMS provider: ${providerName}`);
  }
  
  return providerFactory();
}

export function getWhatsAppProvider(): WhatsAppProvider {
  const providerName = config.whatsapp;
  const providerFactory = providers.whatsapp[providerName as keyof typeof providers.whatsapp];
  
  if (!providerFactory) {
    throw new Error(`Unknown WhatsApp provider: ${providerName}`);
  }
  
  return providerFactory();
}

export function getLanguageDetectionProvider(): LanguageDetectionProvider {
  const providerName = config.languageDetection;
  const providerFactory = providers.languageDetection[providerName as keyof typeof providers.languageDetection];
  
  if (!providerFactory) {
    throw new Error(`Unknown language detection provider: ${providerName}`);
  }
  
  return providerFactory();
}

// Export all provider classes for direct use if needed
export {
  SendGridProvider,
  SMS77Provider,
  MaytApiProvider,
  LanguageLayerProvider
};