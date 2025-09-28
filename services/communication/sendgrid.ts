// Communication service using SendGrid - Based on javascript_sendgrid integration
import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    await mailService.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

// Email templates for appointment communications
export interface AppointmentEmailData {
  adjusterId: string;
  adjusterName: string;
  adjusterPhone: string;
  claimNumber: string;
  policyNumber: string;
  insuredName: string;
  appointmentDate: string;
  appointmentTime: string;
  address: string;
  estimatedDuration?: string;
  rescheduleLink?: string;
  cancelLink?: string;
}

export const emailTemplates = {
  confirmation: {
    subject: (data: AppointmentEmailData) => 
      `Appointment Confirmed - Claim ${data.claimNumber}`,
    
    html: (data: AppointmentEmailData) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .appointment-box { background: white; padding: 20px; border-radius: 8px; margin: 15px 0; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Appointment Confirmed</h1>
          </div>
          <div class="content">
            <p>Dear ${data.insuredName},</p>
            
            <p>Your property inspection appointment has been confirmed for your insurance claim.</p>
            
            <div class="appointment-box">
              <h3>Appointment Details</h3>
              <p><strong>Date:</strong> ${data.appointmentDate}</p>
              <p><strong>Time:</strong> ${data.appointmentTime}</p>
              <p><strong>Address:</strong> ${data.address}</p>
              <p><strong>Claim Number:</strong> ${data.claimNumber}</p>
              <p><strong>Policy Number:</strong> ${data.policyNumber}</p>
              ${data.estimatedDuration ? `<p><strong>Estimated Duration:</strong> ${data.estimatedDuration}</p>` : ''}
            </div>
            
            <div class="appointment-box">
              <h3>Your Adjuster</h3>
              <p><strong>Name:</strong> ${data.adjusterName}</p>
              <p><strong>Phone:</strong> ${data.adjusterPhone}</p>
            </div>
            
            <p><strong>What to expect:</strong></p>
            <ul>
              <li>The adjuster will inspect the damaged property</li>
              <li>Please have your policy documents ready</li>
              <li>Be prepared to discuss the damage and circumstances</li>
              <li>The inspection typically takes ${data.estimatedDuration || '1-2 hours'}</li>
            </ul>
            
            ${data.rescheduleLink ? `<a href="${data.rescheduleLink}" class="button">Reschedule</a>` : ''}
            ${data.cancelLink ? `<a href="${data.cancelLink}" class="button" style="background: #dc2626;">Cancel</a>` : ''}
          </div>
          <div class="footer">
            <p>If you have any questions, please contact your adjuster at ${data.adjusterPhone}</p>
          </div>
        </div>
      </body>
      </html>
    `,
    
    text: (data: AppointmentEmailData) => `
      Appointment Confirmed - Claim ${data.claimNumber}
      
      Dear ${data.insuredName},
      
      Your property inspection appointment has been confirmed:
      
      Date: ${data.appointmentDate}
      Time: ${data.appointmentTime}
      Address: ${data.address}
      Claim Number: ${data.claimNumber}
      Policy Number: ${data.policyNumber}
      
      Your Adjuster: ${data.adjusterName}
      Phone: ${data.adjusterPhone}
      
      What to expect:
      - The adjuster will inspect the damaged property
      - Please have your policy documents ready
      - Be prepared to discuss the damage and circumstances
      - The inspection typically takes ${data.estimatedDuration || '1-2 hours'}
      
      If you have any questions, please contact your adjuster at ${data.adjusterPhone}
    `
  },

  reminder: {
    subject: (data: AppointmentEmailData) => 
      `Reminder: Appointment Tomorrow - Claim ${data.claimNumber}`,
    
    html: (data: AppointmentEmailData) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f59e0b; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .appointment-box { background: white; padding: 20px; border-radius: 8px; margin: 15px 0; }
          .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Appointment Reminder</h1>
          </div>
          <div class="content">
            <p>Dear ${data.insuredName},</p>
            
            <p>This is a friendly reminder about your property inspection appointment scheduled for tomorrow.</p>
            
            <div class="appointment-box">
              <h3>Tomorrow's Appointment</h3>
              <p><strong>Date:</strong> ${data.appointmentDate}</p>
              <p><strong>Time:</strong> ${data.appointmentTime}</p>
              <p><strong>Address:</strong> ${data.address}</p>
              <p><strong>Adjuster:</strong> ${data.adjusterName} (${data.adjusterPhone})</p>
            </div>
            
            <p><strong>Please remember to:</strong></p>
            <ul>
              <li>Be present at the scheduled time</li>
              <li>Have your policy documents available</li>
              <li>Prepare any questions about your claim</li>
              <li>Clear access to damaged areas</li>
            </ul>
            
            ${data.rescheduleLink ? `<a href="${data.rescheduleLink}" class="button">Need to Reschedule?</a>` : ''}
          </div>
          <div class="footer">
            <p>Contact your adjuster at ${data.adjusterPhone} if you have any questions</p>
          </div>
        </div>
      </body>
      </html>
    `,
    
    text: (data: AppointmentEmailData) => `
      Appointment Reminder - Claim ${data.claimNumber}
      
      Dear ${data.insuredName},
      
      Reminder: Your property inspection appointment is scheduled for tomorrow.
      
      Date: ${data.appointmentDate}
      Time: ${data.appointmentTime}
      Address: ${data.address}
      Adjuster: ${data.adjusterName} (${data.adjusterPhone})
      
      Please remember to:
      - Be present at the scheduled time
      - Have your policy documents available
      - Prepare any questions about your claim
      - Clear access to damaged areas
      
      Contact your adjuster at ${data.adjusterPhone} if you have any questions.
    `
  },

  cancellation: {
    subject: (data: AppointmentEmailData) => 
      `Appointment Cancelled - Claim ${data.claimNumber}`,
    
    html: (data: AppointmentEmailData) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .appointment-box { background: white; padding: 20px; border-radius: 8px; margin: 15px 0; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Appointment Cancelled</h1>
          </div>
          <div class="content">
            <p>Dear ${data.insuredName},</p>
            
            <p>Your property inspection appointment has been cancelled.</p>
            
            <div class="appointment-box">
              <h3>Cancelled Appointment</h3>
              <p><strong>Original Date:</strong> ${data.appointmentDate}</p>
              <p><strong>Original Time:</strong> ${data.appointmentTime}</p>
              <p><strong>Claim Number:</strong> ${data.claimNumber}</p>
            </div>
            
            <p>We will contact you shortly to reschedule at a more convenient time.</p>
            
            ${data.rescheduleLink ? `<a href="${data.rescheduleLink}" class="button">Schedule New Appointment</a>` : ''}
          </div>
          <div class="footer">
            <p>Contact your adjuster at ${data.adjusterPhone} if you have any questions</p>
          </div>
        </div>
      </body>
      </html>
    `,
    
    text: (data: AppointmentEmailData) => `
      Appointment Cancelled - Claim ${data.claimNumber}
      
      Dear ${data.insuredName},
      
      Your property inspection appointment has been cancelled.
      
      Original Date: ${data.appointmentDate}
      Original Time: ${data.appointmentTime}
      Claim Number: ${data.claimNumber}
      
      We will contact you shortly to reschedule at a more convenient time.
      
      Contact your adjuster at ${data.adjusterPhone} if you have any questions.
    `
  }
};

export async function sendAppointmentEmail(
  type: 'confirmation' | 'reminder' | 'cancellation',
  emailAddress: string,
  data: AppointmentEmailData,
  fromEmail: string = 'noreply@adjusterscheduler.com'
): Promise<boolean> {
  const template = emailTemplates[type];
  
  return await sendEmail({
    to: emailAddress,
    from: fromEmail,
    subject: template.subject(data),
    html: template.html(data),
    text: template.text(data)
  });
}