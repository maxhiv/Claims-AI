'use client';

import { useState } from 'react';
// Simple UI components  
const Button = ({ onClick, children, className = '', variant = 'default', size = 'default', disabled = false }: any) => (
  <button 
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2 rounded ${size === 'sm' ? 'px-2 py-1 text-sm' : ''} ${variant === 'outline' ? 'border border-gray-300' : 'bg-blue-500 text-white'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
  >
    {children}
  </button>
);

const Card = ({ children, className = '' }: any) => (
  <div className={`bg-white shadow-md rounded-lg ${className}`}>{children}</div>
);

const CardHeader = ({ children }: any) => (
  <div className="px-6 py-4 border-b border-gray-200">{children}</div>
);

const CardTitle = ({ children }: any) => (
  <h3 className="text-lg font-semibold">{children}</h3>
);

const CardContent = ({ children }: any) => (
  <div className="px-6 py-4">{children}</div>
);

const Badge = ({ children, className = '', variant = 'default' }: any) => (
  <span className={`inline-block px-2 py-1 text-xs rounded ${variant === 'outline' ? 'border border-gray-300' : 'bg-gray-100'} ${className}`}>
    {children}
  </span>
);
import { 
  Mail, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Send,
  Phone
} from 'lucide-react';

interface CommunicationLog {
  id: string;
  kind: string;
  direction: 'inbound' | 'outbound';
  bodyPreview: string;
  timestamp: string;
}

interface AppointmentData {
  id: string;
  claimNumber: string;
  insuredName: string;
  insuredEmail: string;
  appointmentDate: string;
  appointmentTime: string;
}

interface CommunicationPanelProps {
  appointment: AppointmentData;
  communications: CommunicationLog[];
  onSendEmail?: (type: 'confirmation' | 'reminder' | 'cancellation') => Promise<void>;
  onRefresh?: () => Promise<void>;
}

export function CommunicationPanel({ 
  appointment, 
  communications, 
  onSendEmail,
  onRefresh 
}: CommunicationPanelProps) {
  const [sending, setSending] = useState<string | null>(null);

  const handleSendEmail = async (type: 'confirmation' | 'reminder' | 'cancellation') => {
    if (!onSendEmail) return;
    
    setSending(type);
    try {
      await onSendEmail(type);
      if (onRefresh) await onRefresh();
    } catch (error) {
      console.error('Failed to send email:', error);
    } finally {
      setSending(null);
    }
  };

  const getKindIcon = (kind: string) => {
    if (kind.includes('email')) return <Mail className="h-4 w-4" />;
    if (kind.includes('sms')) return <MessageSquare className="h-4 w-4" />;
    if (kind.includes('call')) return <Phone className="h-4 w-4" />;
    return <MessageSquare className="h-4 w-4" />;
  };

  const getKindColor = (kind: string) => {
    if (kind.includes('confirmation')) return 'bg-green-100 text-green-800';
    if (kind.includes('reminder')) return 'bg-yellow-100 text-yellow-800';
    if (kind.includes('cancellation')) return 'bg-red-100 text-red-800';
    return 'bg-blue-100 text-blue-800';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Communication Center
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Actions */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-gray-700">Quick Actions</h4>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSendEmail('confirmation')}
              disabled={sending === 'confirmation'}
              className="flex items-center gap-1"
            >
              <CheckCircle className="h-3 w-3" />
              {sending === 'confirmation' ? 'Sending...' : 'Send Confirmation'}
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSendEmail('reminder')}
              disabled={sending === 'reminder'}
              className="flex items-center gap-1"
            >
              <Clock className="h-3 w-3" />
              {sending === 'reminder' ? 'Sending...' : 'Send Reminder'}
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSendEmail('cancellation')}
              disabled={sending === 'cancellation'}
              className="flex items-center gap-1 text-red-600 border-red-200 hover:bg-red-50"
            >
              <AlertCircle className="h-3 w-3" />
              {sending === 'cancellation' ? 'Sending...' : 'Send Cancellation'}
            </Button>
          </div>
        </div>

        {/* Communication History */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm text-gray-700">Communication History</h4>
            {onRefresh && (
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={onRefresh}
                className="h-6 px-2 text-xs"
              >
                Refresh
              </Button>
            )}
          </div>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {communications.length === 0 ? (
              <div className="text-center py-4 text-gray-500 text-sm">
                No communications yet
              </div>
            ) : (
              communications.map((comm) => (
                <div 
                  key={comm.id} 
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg text-sm"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getKindIcon(comm.kind)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${getKindColor(comm.kind)}`}
                      >
                        {comm.kind.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className="text-xs"
                      >
                        {comm.direction.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-gray-700 line-clamp-2">
                      {comm.bodyPreview}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(comm.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Contact Info */}
        <div className="pt-2 border-t text-xs text-gray-600">
          <p><strong>Contact:</strong> {appointment.insuredEmail}</p>
          <p><strong>Appointment:</strong> {appointment.appointmentDate} at {appointment.appointmentTime}</p>
        </div>
      </CardContent>
    </Card>
  );
}