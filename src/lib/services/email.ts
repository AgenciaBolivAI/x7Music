import transporter from '../nodemailer';

const FROM = `"X7 Music Group" <${process.env.SMTP_USER}>`;

/**
 * Branded newsletter/announcement email sent to a single subscriber.
 * `bodyHtml` is the admin-composed message (line breaks already converted to <br/>).
 */
export const sendNewsletterEmail = async (
  to: string,
  subject: string,
  bodyHtml: string,
  unsubscribeUrl: string,
  cta?: { label: string; url: string }
): Promise<void> => {
  const ctaBlock = cta
    ? `<div style="text-align:center;margin:32px 0;">
         <a href="${cta.url}"
            style="display:inline-block;background:#C0392B;color:#ffffff;text-decoration:none;
                   font-weight:bold;padding:14px 32px;border-radius:8px;font-family:Arial,sans-serif;">
           ${cta.label}
         </a>
       </div>`
    : '';

  await transporter.sendMail({
    from: FROM,
    to,
    subject,
    html: `
      <div style="background:#0A0A0A;padding:32px 0;font-family:Arial,sans-serif;">
        <div style="max-width:600px;margin:0 auto;background:#141414;border-radius:12px;overflow:hidden;">
          <div style="background:#0A0A0A;padding:24px 32px;border-bottom:2px solid #C0392B;">
            <span style="color:#ffffff;font-size:20px;font-weight:bold;letter-spacing:1px;">X7 MUSIC GROUP</span>
          </div>
          <div style="padding:32px;color:#d4d4d4;font-size:16px;line-height:1.6;">
            ${bodyHtml}
            ${ctaBlock}
          </div>
          <div style="padding:24px 32px;border-top:1px solid #2a2a2a;color:#777;font-size:12px;line-height:1.5;">
            <p style="margin:0 0 8px;">X7 Music Group · Christian music label, consulting & publishing</p>
            <p style="margin:0;">
              You're receiving this because you subscribed at
              <a href="${process.env.CLIENT_URL}" style="color:#C0392B;">x7musicgroup.com</a>.
              <a href="${unsubscribeUrl}" style="color:#777;text-decoration:underline;">Unsubscribe</a>
            </p>
          </div>
        </div>
      </div>
    `,
  });
};

/** Free-resource / lead-magnet delivery email with a branded download button. */
export const sendResourceEmail = async (
  to: string,
  name: string,
  resourceTitle: string,
  downloadUrl: string
): Promise<void> => {
  await transporter.sendMail({
    from: FROM,
    to,
    subject: `Tu recurso gratuito: ${resourceTitle} — X7 Music Group`,
    html: `
      <div style="background:#0A0A0A;padding:32px 0;font-family:Arial,sans-serif;">
        <div style="max-width:600px;margin:0 auto;background:#141414;border-radius:12px;overflow:hidden;">
          <div style="background:#0A0A0A;padding:24px 32px;border-bottom:2px solid #C0392B;">
            <span style="color:#ffffff;font-size:20px;font-weight:bold;letter-spacing:1px;">X7 MUSIC GROUP</span>
          </div>
          <div style="padding:32px;color:#d4d4d4;font-size:16px;line-height:1.6;">
            <h2 style="color:#ffffff;margin:0 0 12px;">¡Gracias por tu interés${name ? `, ${name}` : ''}!</h2>
            <p style="margin:0 0 8px;">Queremos ayudarte a navegar la industria de la música de la mejor manera posible.</p>
            <p style="margin:0 0 24px;">Aquí está tu recurso gratuito: <strong style="color:#fff;">${resourceTitle}</strong>.</p>
            <div style="text-align:center;margin:28px 0;">
              <a href="${downloadUrl}"
                 style="display:inline-block;background:#C0392B;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 32px;border-radius:8px;">
                Descargar la guía
              </a>
            </div>
            <p style="margin:24px 0 0;font-size:13px;color:#999;">Si el botón no funciona, copia este enlace: <br/>${downloadUrl}</p>
          </div>
          <div style="padding:20px 32px;border-top:1px solid #2a2a2a;color:#777;font-size:12px;">
            X7 Music Group · <a href="${process.env.CLIENT_URL}" style="color:#C0392B;">x7musicgroup.com</a> · info@x7musicgroup.com
          </div>
        </div>
      </div>
    `,
  });
};

export const sendWelcomeEmail = async (to: string, firstName: string): Promise<void> => {
  await transporter.sendMail({
    from: FROM,
    to,
    subject: 'Welcome to X7 Music Group',
    html: `
      <h2>Welcome, ${firstName}!</h2>
      <p>Your account has been created at <strong>X7 Music Group</strong>.</p>
      <p>You can now log in to your client portal to view your catalog, bookings, and documents.</p>
      <p>— Steven Pantojas & The X7 Team</p>
    `,
  });
};

export const sendBookingConfirmation = async (
  to: string,
  firstName: string,
  serviceName: string,
  scheduledAt: Date
): Promise<void> => {
  const dateStr = scheduledAt.toLocaleString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  });
  await transporter.sendMail({
    from: FROM,
    to,
    subject: `Booking Confirmed — ${serviceName}`,
    html: `
      <h2>Your booking is confirmed, ${firstName}!</h2>
      <p><strong>Service:</strong> ${serviceName}</p>
      <p><strong>Date & Time:</strong> ${dateStr}</p>
      <p>You will receive a Zoom/call link closer to the date. If you have questions, reply to this email.</p>
      <p>— Steven Pantojas & The X7 Team</p>
    `,
  });
};

export const sendAdminBookingNotification = async (
  clientName: string,
  serviceName: string,
  scheduledAt: Date
): Promise<void> => {
  const adminEmail = process.env.SMTP_USER!;
  const dateStr = scheduledAt.toLocaleString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  await transporter.sendMail({
    from: FROM,
    to: adminEmail,
    subject: `New Booking: ${serviceName} from ${clientName}`,
    html: `
      <h2>New Booking Request</h2>
      <p><strong>Client:</strong> ${clientName}</p>
      <p><strong>Service:</strong> ${serviceName}</p>
      <p><strong>Date & Time:</strong> ${dateStr}</p>
      <p><a href="${process.env.CLIENT_URL}/admin/bookings">View in Admin Panel</a></p>
    `,
  });
};

export const sendBookingStatusUpdate = async (
  to: string,
  firstName: string,
  serviceName: string,
  status: string
): Promise<void> => {
  const statusMessages: Record<string, string> = {
    confirmed: 'Your booking has been <strong>confirmed</strong>.',
    cancelled: 'Your booking has been <strong>cancelled</strong>. Please contact us to reschedule.',
    completed: 'Your session has been marked as <strong>completed</strong>. Thank you!',
  };
  await transporter.sendMail({
    from: FROM,
    to,
    subject: `Booking Update — ${serviceName}`,
    html: `
      <h2>Booking Update, ${firstName}</h2>
      <p>${statusMessages[status] || `Your booking status is now: ${status}`}</p>
      <p><a href="${process.env.CLIENT_URL}/portal/bookings">View your bookings</a></p>
      <p>— Steven Pantojas & The X7 Team</p>
    `,
  });
};

export const sendInquiryAutoReply = async (to: string, senderName: string): Promise<void> => {
  await transporter.sendMail({
    from: FROM,
    to,
    subject: 'We received your message — X7 Music Group',
    html: `
      <h2>Thanks for reaching out, ${senderName}!</h2>
      <p>We've received your message and will get back to you within 24–48 hours.</p>
      <p>In the meantime, feel free to explore our services or book a free consultation.</p>
      <p><a href="${process.env.CLIENT_URL}/book">Book a Free 10-min Consult</a></p>
      <p>— Steven Pantojas & The X7 Team</p>
    `,
  });
};

export const sendAdminInquiryNotification = async (
  senderName: string,
  senderEmail: string,
  subject: string
): Promise<void> => {
  const adminEmail = process.env.SMTP_USER!;
  await transporter.sendMail({
    from: FROM,
    to: adminEmail,
    subject: `New Inquiry from ${senderName}: ${subject}`,
    html: `
      <h2>New Website Inquiry</h2>
      <p><strong>From:</strong> ${senderName} (${senderEmail})</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <p><a href="${process.env.CLIENT_URL}/admin/inbox">View in Admin Inbox</a></p>
    `,
  });
};

export const sendInquiryReply = async (
  to: string,
  senderName: string,
  originalSubject: string,
  replyText: string
): Promise<void> => {
  await transporter.sendMail({
    from: FROM,
    to,
    subject: `Re: ${originalSubject}`,
    html: `
      <h2>Hi ${senderName},</h2>
      <p>${replyText.replace(/\n/g, '<br/>')}</p>
      <hr/>
      <p>— Steven Pantojas, X7 Music Group</p>
      <p><small><a href="${process.env.CLIENT_URL}">x7musicgroup.com</a></small></p>
    `,
  });
};

export const sendPasswordResetEmail = async (to: string, firstName: string, resetUrl: string): Promise<void> => {
  await transporter.sendMail({
    from: FROM,
    to,
    subject: 'Password Reset — X7 Music Group',
    html: `
      <h2>Hi ${firstName},</h2>
      <p>You requested a password reset. Click the link below (valid for 1 hour):</p>
      <p><a href="${resetUrl}">Reset My Password</a></p>
      <p>If you did not request this, please ignore this email.</p>
      <p>— X7 Music Group</p>
    `,
  });
};

/** Branded request asking a signer to review + digitally sign an agreement. */
export const sendSignatureRequestEmail = async (
  to: string,
  signerName: string,
  agreementTitle: string,
  signUrl: string
): Promise<void> => {
  await transporter.sendMail({
    from: FROM,
    to,
    subject: `Firma requerida: ${agreementTitle} — X7 Music Group`,
    html: `
      <div style="background:#0A0A0A;padding:32px 0;font-family:Arial,sans-serif;">
        <div style="max-width:600px;margin:0 auto;background:#141414;border-radius:12px;overflow:hidden;">
          <div style="background:#0A0A0A;padding:24px 32px;border-bottom:2px solid #C0392B;">
            <span style="color:#ffffff;font-size:20px;font-weight:bold;letter-spacing:1px;">X7 MUSIC GROUP</span>
          </div>
          <div style="padding:32px;color:#d4d4d4;font-size:16px;line-height:1.6;">
            <h2 style="color:#ffffff;margin:0 0 12px;">Hola${signerName ? `, ${signerName}` : ''},</h2>
            <p style="margin:0 0 8px;">Se te ha solicitado revisar y firmar el siguiente documento:</p>
            <p style="margin:0 0 24px;"><strong style="color:#fff;">${agreementTitle}</strong></p>
            <div style="text-align:center;margin:28px 0;">
              <a href="${signUrl}"
                 style="display:inline-block;background:#C0392B;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 32px;border-radius:8px;">
                Revisar y Firmar
              </a>
            </div>
            <p style="margin:24px 0 0;font-size:13px;color:#999;">Si el botón no funciona, copia este enlace:<br/>${signUrl}</p>
            <p style="margin:16px 0 0;font-size:12px;color:#777;">Este enlace es personal; no lo compartas.</p>
          </div>
          <div style="padding:20px 32px;border-top:1px solid #2a2a2a;color:#777;font-size:12px;">
            X7 Music Group · <a href="${process.env.CLIENT_URL}" style="color:#C0392B;">x7musicgroup.com</a>
          </div>
        </div>
      </div>
    `,
  });
};

/** Branded "fully signed" notice with the completed PDF attached. */
export const sendAgreementCompletedEmail = async (
  to: string,
  recipientName: string,
  agreementTitle: string,
  pdf: Uint8Array,
  filename: string
): Promise<void> => {
  await transporter.sendMail({
    from: FROM,
    to,
    subject: `Documento firmado: ${agreementTitle} — X7 Music Group`,
    attachments: [{ filename, content: Buffer.from(pdf), contentType: 'application/pdf' }],
    html: `
      <div style="background:#0A0A0A;padding:32px 0;font-family:Arial,sans-serif;">
        <div style="max-width:600px;margin:0 auto;background:#141414;border-radius:12px;overflow:hidden;">
          <div style="background:#0A0A0A;padding:24px 32px;border-bottom:2px solid #C0392B;">
            <span style="color:#ffffff;font-size:20px;font-weight:bold;letter-spacing:1px;">X7 MUSIC GROUP</span>
          </div>
          <div style="padding:32px;color:#d4d4d4;font-size:16px;line-height:1.6;">
            <h2 style="color:#ffffff;margin:0 0 12px;">¡Listo${recipientName ? `, ${recipientName}` : ''}!</h2>
            <p style="margin:0 0 8px;">Todas las partes han firmado el documento:</p>
            <p style="margin:0 0 16px;"><strong style="color:#fff;">${agreementTitle}</strong></p>
            <p style="margin:0;">Encontrarás el documento firmado adjunto en formato PDF para tus registros.</p>
          </div>
          <div style="padding:20px 32px;border-top:1px solid #2a2a2a;color:#777;font-size:12px;">
            X7 Music Group · <a href="${process.env.CLIENT_URL}" style="color:#C0392B;">x7musicgroup.com</a>
          </div>
        </div>
      </div>
    `,
  });
};

export const sendCatalogStatusUpdate = async (
  to: string,
  firstName: string,
  title: string,
  status: string,
  notes: string
): Promise<void> => {
  const statusLabels: Record<string, string> = {
    pending: 'Pending',
    in_progress: 'In Progress',
    registered: 'Successfully Registered',
    issue: 'Needs Attention',
  };
  await transporter.sendMail({
    from: FROM,
    to,
    subject: `Catalog Update: "${title}" — ${statusLabels[status] || status}`,
    html: `
      <h2>Catalog Update, ${firstName}</h2>
      <p>Your work <strong>"${title}"</strong> has a status update:</p>
      <p><strong>Status:</strong> ${statusLabels[status] || status}</p>
      ${notes ? `<p><strong>Notes from Steven:</strong> ${notes}</p>` : ''}
      <p><a href="${process.env.CLIENT_URL}/portal/catalog">View your catalog</a></p>
      <p>— Steven Pantojas & The X7 Team</p>
    `,
  });
};
