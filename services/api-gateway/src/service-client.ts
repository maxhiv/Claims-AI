// HTTP client for communicating with microservices

interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

const SERVICE_URLS = {
  comms: process.env.COMMS_SERVICE_URL || 'http://localhost:8008',
  routing: process.env.ROUTING_SERVICE_URL || 'http://localhost:8099', 
  cq: process.env.CQ_SERVICE_URL || 'http://localhost:6000',
  scheduler: process.env.SCHEDULER_SERVICE_URL || 'http://localhost:6800'
};

export async function callService<T = any>(
  serviceName: keyof typeof SERVICE_URLS,
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: any;
    headers?: Record<string, string>;
    timeout?: number;
  } = {}
): Promise<ServiceResponse<T>> {
  const {
    method = 'GET',
    body,
    headers = {},
    timeout = 10000
  } = options;

  const baseUrl = SERVICE_URLS[serviceName];
  const url = `${baseUrl}${endpoint}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AI-Scheduler-Gateway/1.0',
        ...headers
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const responseText = await response.text();
    let responseData;

    try {
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch {
      responseData = { raw: responseText };
    }

    if (!response.ok) {
      return {
        success: false,
        error: `Service ${serviceName} error: ${response.status} - ${responseData.error || response.statusText}`
      };
    }

    return {
      success: true,
      data: responseData
    };

  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: `Service ${serviceName} timeout after ${timeout}ms`
      };
    }

    return {
      success: false,
      error: `Service ${serviceName} connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Service-specific client functions
export const commsService = {
  sendEmail: (data: any) => callService('comms', '/send-email', { method: 'POST', body: data }),
  sendSMS: (data: any) => callService('comms', '/send-sms', { method: 'POST', body: data }),
  sendWhatsApp: (data: any) => callService('comms', '/send-whatsapp', { method: 'POST', body: data }),
  detectLanguage: (data: any) => callService('comms', '/detect-language', { method: 'POST', body: data }),
  getHealth: () => callService('comms', '/health')
};

export const routingService = {
  geocode: (data: any) => callService('routing', '/geocode', { method: 'POST', body: data }),
  reverseGeocode: (data: any) => callService('routing', '/reverse-geocode', { method: 'POST', body: data }),
  calculateRoute: (data: any) => callService('routing', '/calculate-route', { method: 'POST', body: data }),
  optimizeRoute: (data: any) => callService('routing', '/optimize', { method: 'POST', body: data }),
  batchGeocode: (data: any) => callService('routing', '/batch-geocode', { method: 'POST', body: data }),
  getHealth: () => callService('routing', '/health')
};

export const cqService = {
  verifyAddress: (data: any) => callService('cq', '/verify-address', { method: 'POST', body: data }),
  suggestAddresses: (data: any) => callService('cq', '/suggest-addresses', { method: 'POST', body: data }),
  verifyAddresses: (data: any) => callService('cq', '/verify-addresses', { method: 'POST', body: data }),
  checkQuality: (data: any) => callService('cq', '/check-quality', { method: 'POST', body: data }),
  getHealth: () => callService('cq', '/health')
};

export const schedulerService = {
  getHolidays: (data: any) => callService('scheduler', '/holidays', { method: 'POST', body: data }),
  isHoliday: (data: any) => callService('scheduler', '/is-holiday', { method: 'POST', body: data }),
  getTimezone: (data: any) => callService('scheduler', '/timezone', { method: 'POST', body: data }),
  convertTime: (data: any) => callService('scheduler', '/convert-time', { method: 'POST', body: data }),
  generateSchedule: (data: any) => callService('scheduler', '/generate-schedule', { method: 'POST', body: data }),
  findAvailableSlots: (data: any) => callService('scheduler', '/available-slots', { method: 'POST', body: data }),
  optimizeSchedule: (data: any) => callService('scheduler', '/optimize-schedule', { method: 'POST', body: data }),
  getHealth: () => callService('scheduler', '/health')
};