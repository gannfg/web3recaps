import { emailTemplates, type EventNotificationData, type EmailTemplate } from './email-templates'

export interface EmailService {
  sendEmail: (to: string, template: EmailTemplate) => Promise<boolean>
  sendEventReminder: (data: EventNotificationData) => Promise<boolean>
  sendEventConfirmation: (data: EventNotificationData) => Promise<boolean>
  sendWaitlistConfirmation: (data: EventNotificationData) => Promise<boolean>
  sendEventCancelled: (data: EventNotificationData) => Promise<boolean>
  sendCheckInReminder: (data: EventNotificationData) => Promise<boolean>
}

// Mock email service for development
class MockEmailService implements EmailService {
  async sendEmail(to: string, template: EmailTemplate): Promise<boolean> {
    console.log('📧 Mock Email Sent:')
    console.log('To:', to)
    console.log('Subject:', template.subject)
    console.log('Text:', template.text)
    console.log('---')
    
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 100))
    return true
  }

  async sendEventReminder(data: EventNotificationData): Promise<boolean> {
    const template = emailTemplates.eventReminder(data)
    return this.sendEmail(data.attendeeEmail, template)
  }

  async sendEventConfirmation(data: EventNotificationData): Promise<boolean> {
    const template = emailTemplates.eventConfirmation(data)
    return this.sendEmail(data.attendeeEmail, template)
  }

  async sendWaitlistConfirmation(data: EventNotificationData): Promise<boolean> {
    const template = emailTemplates.waitlistConfirmation(data)
    return this.sendEmail(data.attendeeEmail, template)
  }

  async sendEventCancelled(data: EventNotificationData): Promise<boolean> {
    const template = emailTemplates.eventCancelled(data)
    return this.sendEmail(data.attendeeEmail, template)
  }

  async sendCheckInReminder(data: EventNotificationData): Promise<boolean> {
    const template = emailTemplates.checkInReminder(data)
    return this.sendEmail(data.attendeeEmail, template)
  }
}

// Resend email service for production
class ResendEmailService implements EmailService {
  private apiKey: string
  private fromEmail: string

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY || ''
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@yourdomain.com'
  }

  async sendEmail(to: string, template: EmailTemplate): Promise<boolean> {
    if (!this.apiKey) {
      console.error('Resend API key not configured')
      return false
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.fromEmail,
          to: [to],
          subject: template.subject,
          html: template.html,
          text: template.text,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        console.error('Failed to send email:', error)
        return false
      }

      const result = await response.json()
      console.log('Email sent successfully:', result.id)
      return true
    } catch (error) {
      console.error('Error sending email:', error)
      return false
    }
  }

  async sendEventReminder(data: EventNotificationData): Promise<boolean> {
    const template = emailTemplates.eventReminder(data)
    return this.sendEmail(data.attendeeEmail, template)
  }

  async sendEventConfirmation(data: EventNotificationData): Promise<boolean> {
    const template = emailTemplates.eventConfirmation(data)
    return this.sendEmail(data.attendeeEmail, template)
  }

  async sendWaitlistConfirmation(data: EventNotificationData): Promise<boolean> {
    const template = emailTemplates.waitlistConfirmation(data)
    return this.sendEmail(data.attendeeEmail, template)
  }

  async sendEventCancelled(data: EventNotificationData): Promise<boolean> {
    const template = emailTemplates.eventCancelled(data)
    return this.sendEmail(data.attendeeEmail, template)
  }

  async sendCheckInReminder(data: EventNotificationData): Promise<boolean> {
    const template = emailTemplates.checkInReminder(data)
    return this.sendEmail(data.attendeeEmail, template)
  }
}

// Create email service instance
export const emailService: EmailService = process.env.NODE_ENV === 'production' && process.env.RESEND_API_KEY
  ? new ResendEmailService()
  : new MockEmailService()

// Utility functions for common email operations
export const sendEventNotification = async (
  type: 'reminder' | 'confirmation' | 'waitlist' | 'cancelled' | 'checkin',
  data: EventNotificationData
): Promise<boolean> => {
  try {
    switch (type) {
      case 'reminder':
        return await emailService.sendEventReminder(data)
      case 'confirmation':
        return await emailService.sendEventConfirmation(data)
      case 'waitlist':
        return await emailService.sendWaitlistConfirmation(data)
      case 'cancelled':
        return await emailService.sendEventCancelled(data)
      case 'checkin':
        return await emailService.sendCheckInReminder(data)
      default:
        console.error('Unknown email type:', type)
        return false
    }
  } catch (error) {
    console.error('Error sending event notification:', error)
    return false
  }
}

// Batch email sending for multiple recipients
export const sendBulkEventNotification = async (
  type: 'reminder' | 'confirmation' | 'waitlist' | 'cancelled' | 'checkin',
  recipients: EventNotificationData[]
): Promise<{ success: number; failed: number }> => {
  let success = 0
  let failed = 0

  for (const recipient of recipients) {
    const result = await sendEventNotification(type, recipient)
    if (result) {
      success++
    } else {
      failed++
    }
  }

  return { success, failed }
}
