export default function welcomeHtml(trimmedName, leadId){
    const openPixel = `${process.env.NEXT_PUBLIC_APP_URL}/api/email/track/open?leadId=${leadId}`;
    const callLink = `${process.env.NEXT_PUBLIC_APP_URL}/api/email/track/click?leadId=${leadId}&action=call`;
    const whatsappLink = `${process.env.NEXT_PUBLIC_APP_URL}/api/email/track/click?leadId=${leadId}&action=whatsapp`;
    const websiteLink = `${process.env.NEXT_PUBLIC_APP_URL}/api/email/track/click?leadId=${leadId}&action=website`;

    // Brand Colors mimicking the referenced image style
    const primaryColor = "#4a1c9e";
    const textDark = "#111827";
    const textGray = "#4b5563";
    const bgSoft = "#f3f0ff";

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thank You for Your Enquiry</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f7f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    
    <table width="100%" cellspacing="0" cellpadding="0" style="background-color: #f7f7f9; padding: 40px 20px;">
        <tr>
            <td align="center">
                <!-- Main Card Container -->
                <table width="100%" max-width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">
                    
                    <!-- Header / Logo -->
                    <tr>
                        <td align="center" style="padding: 40px 40px 20px 40px;">
                            <img src="https://openshift.grras.com/frontassets/img/logo.png" alt="GRRAS Logo" width="140" style="display: block; border: none; margin: 0 auto;">
                        </td>
                    </tr>

                    <!-- Text Content -->
                    <tr>
                        <td align="center" style="padding: 0 40px 30px 40px;">
                            <h1 style="margin: 0 0 20px 0; font-size: 32px; color: ${textDark}; font-weight: 700; letter-spacing: -1px;">
                                Enquiry Received
                            </h1>
                            <p style="margin: 0 0 20px 0; font-size: 15px; color: ${textGray}; line-height: 1.6; max-width: 450px;">
                                Hello <strong>${trimmedName}</strong>, thank you for showing interest in our training programs. Our team has successfully received your details and will contact you shortly to guide you forward.
                            </p>
                        </td>
                    </tr>

                    <!-- Highlight Box (Mimicking the illustration box layout) -->
                    <tr>
                        <td align="center" style="padding: 0 40px 30px 40px;">
                            <table width="100%" cellspacing="0" cellpadding="0" style="max-width: 400px; background-color: ${bgSoft}; border-radius: 16px;">
                                <tr>
                                    <td align="center" style="padding: 30px;">
                                        <h2 style="margin: 0 0 15px 0; font-size: 14px; color: ${primaryColor}; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700;">
                                            Why Learn With Us
                                        </h2>
                                        <table width="100%" cellspacing="0" cellpadding="0" style="margin: 0;">
                                            <tr><td align="center" style="padding-bottom: 10px; font-size: 15px; color: ${textDark}; font-weight: 500;">&bull; Live Instructor-Led Training</td></tr>
                                            <tr><td align="center" style="padding-bottom: 10px; font-size: 15px; color: ${textDark}; font-weight: 500;">&bull; Real Projects & Assignments</td></tr>
                                            <tr><td align="center" style="padding-bottom: 10px; font-size: 15px; color: ${textDark}; font-weight: 500;">&bull; Industry Certifications</td></tr>
                                            <tr><td align="center" style="padding-bottom: 0px; font-size: 15px; color: ${textDark}; font-weight: 500;">&bull; Placement Assistance</td></tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- CTA Buttons / Links -->
                    <tr>
                        <td align="center" style="padding: 0 40px 40px 40px;">
                            <p style="margin: 0 0 20px 0; font-size: 15px; color: ${textGray}; line-height: 1.6;">
                                Need answers right away? Connect with us directly:
                            </p>
                            
                            <!-- Primary CTA Button -->
                            <table cellspacing="0" cellpadding="0" style="margin-bottom: 25px;">
                                <tr>
                                    <td align="center" bgcolor="${primaryColor}" style="border-radius: 8px;">
                                        <a href="${whatsappLink}" target="_blank" style="font-size: 16px; font-weight: 600; font-family: -apple-system, sans-serif; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; display: inline-block;">
                                            <span style="display: inline-block; vertical-align: middle; margin-right: 8px;">
                                                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                                                </svg>
                                            </span>
                                            <span style="vertical-align: middle;">Chat on WhatsApp</span>
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Secondary Links -->
                            <table cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" style="padding: 0 15px;">
                                        <a href="${callLink}" style="color: ${textGray}; font-weight: 500; text-decoration: none; font-size: 14px; display: inline-block;">
                                            <span style="display: inline-block; vertical-align: middle; margin-right: 4px;">
                                                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                                                </svg>
                                            </span>
                                            <span style="vertical-align: middle;">Call Counsellor</span>
                                        </a>
                                    </td>
                                    <td align="center" style="padding: 0 15px; border-left: 1px solid #eaeaea;">
                                        <a href="${websiteLink}" style="color: ${textGray}; font-weight: 500; text-decoration: none; font-size: 14px; display: inline-block;">
                                            <span style="display: inline-block; vertical-align: middle; margin-right: 4px;">
                                                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                                    <circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                                                </svg>
                                            </span>
                                            <span style="vertical-align: middle;">Visit Website</span>
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer Row -->
                    <tr>
                        <td style="padding: 30px 40px; border-top: 1px solid #f3f4f6;">
                            <table width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <!-- Contact & Info (Left Aligned) -->
                                    <td align="left" style="font-size: 12px; color: #9ca3af; line-height: 1.6;">
                                        <strong style="color: ${textGray};">Need immediate help?</strong> Call +91 9876543210<br>
                                        <a href="https://digital-marketing.grras.com/" style="color: ${primaryColor}; text-decoration: none;">digital-marketing.grras.com</a><br>
                                        &copy; ${new Date().getFullYear()} GRRAS Solutions.
                                    </td>
                                    
                                    <!-- Social Icons (Right Aligned) -->
                                    <td align="right" valign="bottom">
                                        <table cellspacing="0" cellpadding="0">
                                            <tr>
                                                <!-- Instagram -->
                                                <td style="padding-left: 12px;">
                                                    <a href="#" style="color: ${primaryColor};">
                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                                                    </a>
                                                </td>
                                                <!-- Facebook -->
                                                <td style="padding-left: 12px;">
                                                    <a href="#" style="color: ${primaryColor};">
                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                                                    </a>
                                                </td>
                                                <!-- X / Twitter -->
                                                <td style="padding-left: 12px;">
                                                    <a href="#" style="color: ${primaryColor};">
                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="4" x2="20" y2="20"></line><line x1="20" y1="4" x2="4" y2="20"></line></svg>
                                                    </a>
                                                </td>
                                                <!-- LinkedIn -->
                                                <td style="padding-left: 12px;">
                                                    <a href="#" style="color: ${primaryColor};">
                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>

    <!-- FIXED: Tracking Pixel set to display: block to prevent client blocking -->
    <img src="${openPixel}" width="1" height="1" alt="" style="display: block; border: none; margin: 0; padding: 0; outline: none; text-decoration: none;" />
</body>
</html>`;
}