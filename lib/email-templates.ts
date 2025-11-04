export interface EmailTemplate {
  subject: string
  html: string
  text: string
}

export interface EventNotificationData {
  eventTitle: string
  eventDate: string
  eventTime: string
  eventLocation: string
  eventDescription?: string
  organizerName: string
  attendeeName: string
  attendeeEmail: string
  eventUrl: string
  unsubscribeUrl: string
  waitlistPosition?: number
  checkInCode?: string
}

export const emailTemplates = {
  eventReminder: (data: EventNotificationData): EmailTemplate => ({
    subject: `Reminder: ${data.eventTitle} is tomorrow!`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Event Reminder</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Event Reminder</h1>
            <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">Don't miss out on this amazing event!</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #333; margin-top: 0;">${data.eventTitle}</h2>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #495057;">Event Details</h3>
              <p style="margin: 5px 0;"><strong>📅 Date:</strong> ${data.eventDate}</p>
              <p style="margin: 5px 0;"><strong>🕐 Time:</strong> ${data.eventTime}</p>
              <p style="margin: 5px 0;"><strong>📍 Location:</strong> ${data.eventLocation}</p>
              <p style="margin: 5px 0;"><strong>👤 Organizer:</strong> ${data.organizerName}</p>
            </div>
            
            ${data.eventDescription ? `
              <div style="margin: 20px 0;">
                <h3 style="color: #495057;">Description</h3>
                <p style="color: #6c757d;">${data.eventDescription}</p>
              </div>
            ` : ''}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.eventUrl}" style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">View Event Details</a>
            </div>
            
            <div style="border-top: 1px solid #dee2e6; padding-top: 20px; margin-top: 30px; font-size: 14px; color: #6c757d;">
              <p>This is an automated reminder for the event you registered for.</p>
              <p>If you can no longer attend, please <a href="${data.eventUrl}">cancel your booking</a> to free up space for others.</p>
              <p><a href="${data.unsubscribeUrl}">Unsubscribe from event notifications</a></p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Event Reminder: ${data.eventTitle}

Hello ${data.attendeeName},

This is a reminder that you have registered for "${data.eventTitle}" which is happening tomorrow!

Event Details:
- Date: ${data.eventDate}
- Time: ${data.eventTime}
- Location: ${data.eventLocation}
- Organizer: ${data.organizerName}

${data.eventDescription ? `Description: ${data.eventDescription}\n` : ''}

View event details: ${data.eventUrl}

If you can no longer attend, please cancel your booking to free up space for others.

Unsubscribe: ${data.unsubscribeUrl}
    `.trim()
  }),

  eventConfirmation: (data: EventNotificationData): EmailTemplate => ({
    subject: `Confirmed: You're registered for ${data.eventTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Event Confirmation</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">✅ Registration Confirmed!</h1>
            <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">You're all set for this amazing event!</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #333; margin-top: 0;">${data.eventTitle}</h2>
            
            <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
              <h3 style="margin-top: 0; color: #155724;">🎉 You're In!</h3>
              <p style="margin: 0; color: #155724;">Your registration has been confirmed. We're excited to see you there!</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #495057;">Event Details</h3>
              <p style="margin: 5px 0;"><strong>📅 Date:</strong> ${data.eventDate}</p>
              <p style="margin: 5px 0;"><strong>🕐 Time:</strong> ${data.eventTime}</p>
              <p style="margin: 5px 0;"><strong>📍 Location:</strong> ${data.eventLocation}</p>
              <p style="margin: 5px 0;"><strong>👤 Organizer:</strong> ${data.organizerName}</p>
            </div>
            
            ${data.eventDescription ? `
              <div style="margin: 20px 0;">
                <h3 style="color: #495057;">Description</h3>
                <p style="color: #6c757d;">${data.eventDescription}</p>
              </div>
            ` : ''}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.eventUrl}" style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">View Event Details</a>
            </div>
            
            <div style="border-top: 1px solid #dee2e6; padding-top: 20px; margin-top: 30px; font-size: 14px; color: #6c757d;">
              <p>This confirmation email was sent because you registered for this event.</p>
              <p>If you need to cancel, please <a href="${data.eventUrl}">visit the event page</a>.</p>
              <p><a href="${data.unsubscribeUrl}">Unsubscribe from event notifications</a></p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Registration Confirmed: ${data.eventTitle}

Hello ${data.attendeeName},

Great news! Your registration for "${data.eventTitle}" has been confirmed.

Event Details:
- Date: ${data.eventDate}
- Time: ${data.eventTime}
- Location: ${data.eventLocation}
- Organizer: ${data.organizerName}

${data.eventDescription ? `Description: ${data.eventDescription}\n` : ''}

View event details: ${data.eventUrl}

If you need to cancel, please visit the event page.

Unsubscribe: ${data.unsubscribeUrl}
    `.trim()
  }),

  waitlistConfirmation: (data: EventNotificationData): EmailTemplate => ({
    subject: `Waitlisted: ${data.eventTitle} - Position #${data.waitlistPosition}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Waitlist Confirmation</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #ffc107 0%, #fd7e14 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">⏳ You're on the Waitlist</h1>
            <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">We'll notify you if a spot opens up!</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #333; margin-top: 0;">${data.eventTitle}</h2>
            
            <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
              <h3 style="margin-top: 0; color: #856404;">Waitlist Position: #${data.waitlistPosition}</h3>
              <p style="margin: 0; color: #856404;">This event is currently full, but you're on the waitlist! We'll automatically move you to confirmed if a spot opens up.</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #495057;">Event Details</h3>
              <p style="margin: 5px 0;"><strong>📅 Date:</strong> ${data.eventDate}</p>
              <p style="margin: 5px 0;"><strong>🕐 Time:</strong> ${data.eventTime}</p>
              <p style="margin: 5px 0;"><strong>📍 Location:</strong> ${data.eventLocation}</p>
              <p style="margin: 5px 0;"><strong>👤 Organizer:</strong> ${data.organizerName}</p>
            </div>
            
            ${data.eventDescription ? `
              <div style="margin: 20px 0;">
                <h3 style="color: #495057;">Description</h3>
                <p style="color: #6c757d;">${data.eventDescription}</p>
              </div>
            ` : ''}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.eventUrl}" style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">View Event Details</a>
            </div>
            
            <div style="border-top: 1px solid #dee2e6; padding-top: 20px; margin-top: 30px; font-size: 14px; color: #6c757d;">
              <p>We'll notify you immediately if a spot becomes available and you're moved to confirmed.</p>
              <p>If you no longer want to attend, please <a href="${data.eventUrl}">cancel your waitlist position</a>.</p>
              <p><a href="${data.unsubscribeUrl}">Unsubscribe from event notifications</a></p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Waitlisted: ${data.eventTitle}

Hello ${data.attendeeName},

You've been added to the waitlist for "${data.eventTitle}".

Waitlist Position: #${data.waitlistPosition}

This event is currently full, but we'll automatically move you to confirmed if a spot opens up.

Event Details:
- Date: ${data.eventDate}
- Time: ${data.eventTime}
- Location: ${data.eventLocation}
- Organizer: ${data.organizerName}

${data.eventDescription ? `Description: ${data.eventDescription}\n` : ''}

View event details: ${data.eventUrl}

We'll notify you immediately if a spot becomes available.

Unsubscribe: ${data.unsubscribeUrl}
    `.trim()
  }),

  eventCancelled: (data: EventNotificationData): EmailTemplate => ({
    subject: `Cancelled: ${data.eventTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Event Cancelled</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #dc3545 0%, #e83e8c 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">❌ Event Cancelled</h1>
            <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">We're sorry for the inconvenience</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #333; margin-top: 0;">${data.eventTitle}</h2>
            
            <div style="background: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
              <h3 style="margin-top: 0; color: #721c24;">Event Cancelled</h3>
              <p style="margin: 0; color: #721c24;">Unfortunately, this event has been cancelled. We apologize for any inconvenience this may cause.</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #495057;">Event Details</h3>
              <p style="margin: 5px 0;"><strong>📅 Date:</strong> ${data.eventDate}</p>
              <p style="margin: 5px 0;"><strong>🕐 Time:</strong> ${data.eventTime}</p>
              <p style="margin: 5px 0;"><strong>📍 Location:</strong> ${data.eventLocation}</p>
              <p style="margin: 5px 0;"><strong>👤 Organizer:</strong> ${data.organizerName}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.eventUrl}" style="background: #6c757d; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">View Event Page</a>
            </div>
            
            <div style="border-top: 1px solid #dee2e6; padding-top: 20px; margin-top: 30px; font-size: 14px; color: #6c757d;">
              <p>We hope to see you at future events!</p>
              <p><a href="${data.unsubscribeUrl}">Unsubscribe from event notifications</a></p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Event Cancelled: ${data.eventTitle}

Hello ${data.attendeeName},

Unfortunately, the event "${data.eventTitle}" has been cancelled.

Event Details:
- Date: ${data.eventDate}
- Time: ${data.eventTime}
- Location: ${data.eventLocation}
- Organizer: ${data.organizerName}

We apologize for any inconvenience this may cause. We hope to see you at future events!

View event page: ${data.eventUrl}

Unsubscribe: ${data.unsubscribeUrl}
    `.trim()
  }),

  checkInReminder: (data: EventNotificationData): EmailTemplate => ({
    subject: `Check-in Code: ${data.eventTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Check-in Code</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #17a2b8 0%, #6f42c1 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">📱 Check-in Code</h1>
            <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">Use this code to check in at the event</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #333; margin-top: 0;">${data.eventTitle}</h2>
            
            <div style="background: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #17a2b8;">
              <h3 style="margin-top: 0; color: #0c5460;">Your Check-in Code</h3>
              <div style="background: white; padding: 15px; border-radius: 5px; text-align: center; font-family: monospace; font-size: 24px; font-weight: bold; color: #0c5460; letter-spacing: 2px;">
                ${data.checkInCode}
              </div>
              <p style="margin: 10px 0 0 0; color: #0c5460; text-align: center;">Show this code to the event organizer to check in</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #495057;">Event Details</h3>
              <p style="margin: 5px 0;"><strong>📅 Date:</strong> ${data.eventDate}</p>
              <p style="margin: 5px 0;"><strong>🕐 Time:</strong> ${data.eventTime}</p>
              <p style="margin: 5px 0;"><strong>📍 Location:</strong> ${data.eventLocation}</p>
              <p style="margin: 5px 0;"><strong>👤 Organizer:</strong> ${data.organizerName}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.eventUrl}" style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">View Event Details</a>
            </div>
            
            <div style="border-top: 1px solid #dee2e6; padding-top: 20px; margin-top: 30px; font-size: 14px; color: #6c757d;">
              <p>Keep this email handy for easy check-in at the event!</p>
              <p><a href="${data.unsubscribeUrl}">Unsubscribe from event notifications</a></p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Check-in Code: ${data.eventTitle}

Hello ${data.attendeeName},

Here's your check-in code for "${data.eventTitle}":

Check-in Code: ${data.checkInCode}

Event Details:
- Date: ${data.eventDate}
- Time: ${data.eventTime}
- Location: ${data.eventLocation}
- Organizer: ${data.organizerName}

Show this code to the event organizer to check in.

View event details: ${data.eventUrl}

Unsubscribe: ${data.unsubscribeUrl}
    `.trim()
  })
}
