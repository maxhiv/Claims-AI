// Client-side API functions for communication endpoints

const API_BASE = '/api/proxy';

export interface SendEmailRequest {
  type: 'confirmation' | 'reminder' | 'cancellation';
  appointmentId: string;
  fromEmail?: string;
}

export interface CommunicationLog {
  id: string;
  kind: string;
  direction: 'inbound' | 'outbound';
  bodyPreview: string;
  timestamp: string;
}

export async function sendAppointmentEmail(request: SendEmailRequest): Promise<{ status: string; message: string }> {
  const response = await fetch(`${API_BASE}/api/communications/send-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send email');
  }

  return response.json();
}

export async function getCommunicationHistory(appointmentId: string): Promise<{ communications: CommunicationLog[] }> {
  const response = await fetch(`${API_BASE}/api/communications/history/${appointmentId}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch communication history');
  }

  return response.json();
}

export async function sendReminderEmails(): Promise<{ remindersSent: number; remindersSkipped: number }> {
  const response = await fetch(`${API_BASE}/api/communications/send-reminders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send reminder emails');
  }

  return response.json();
}