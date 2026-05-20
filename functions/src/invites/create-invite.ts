// functions/src/invites/create-invite.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { randomBytes } from "crypto";
import sgMail from "@sendgrid/mail";

const sendgridApiKey = defineSecret("SENDGRID_API_KEY");

export const createInvite = onCall({ secrets: [sendgridApiKey] }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }
  if (request.auth.token.role !== "teacher") {
    throw new HttpsError("permission-denied", "Only teachers can create invites");
  }

  const { studentName, studentEmail } = request.data ?? {};

  if (typeof studentName !== "string" || studentName.length < 2 || studentName.length > 80) {
    throw new HttpsError("invalid-argument", "Student name must be 2-80 characters");
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (typeof studentEmail !== "string" || !emailRegex.test(studentEmail)) {
    throw new HttpsError("invalid-argument", "Valid email is required");
  }

  const db = getFirestore();
  const uid = request.auth.uid;

  // Rate limit: max 50 pending invites per teacher
  const pendingSnap = await db
    .collection("invites")
    .where("teacherId", "==", uid)
    .where("status", "==", "pending")
    .count()
    .get();

  if (pendingSnap.data().count >= 50) {
    throw new HttpsError(
      "resource-exhausted",
      "Maximum 50 pending invites. Revoke unused invites to send more."
    );
  }

  // Get teacher name for the email
  const teacherDoc = await db.collection("users").doc(uid).get();
  const teacherName = teacherDoc.data()?.displayName ?? "Your teacher";

  const token = randomBytes(18).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const origin = request.rawRequest?.headers?.origin || "https://tunefolio-dev.web.app";
  const inviteUrl = `${origin}/invite/${token}`;

  const docRef = await db.collection("invites").add({
    teacherId: uid,
    studentName: studentName.trim(),
    studentEmail: studentEmail.trim().toLowerCase(),
    token,
    status: "pending",
    expiresAt,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Send invite email
  try {
    sgMail.setApiKey(sendgridApiKey.value());
    await sgMail.send({
      to: studentEmail.trim().toLowerCase(),
      from: { email: "maestro@signalmailer.com", name: "TuneFolio" },
      replyTo: { email: "no-reply@signalmailer.com", name: "TuneFolio" },
      subject: `${teacherName} invited you to TuneFolio`,
      html: buildInviteEmail(studentName.trim(), teacherName, inviteUrl),
    });
  } catch (err) {
    console.error("Failed to send invite email:", err);
    // Don't fail the invite creation if email fails — teacher can still share the link
  }

  return {
    inviteId: docRef.id,
    token,
    inviteUrl,
  };
});

function buildInviteEmail(studentName: string, teacherName: string, inviteUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>You're invited to TuneFolio</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f5f0eb;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f0eb;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <!-- Card -->
        <table role="presentation" width="540" cellpadding="0" cellspacing="0" style="max-width:540px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(61,46,30,0.08);">

          <!-- Header band -->
          <tr>
            <td style="background: linear-gradient(135deg, #3d2e1e 0%, #5c4a38 100%); padding:36px 40px 32px; text-align:center;">
              <!-- Music note icon -->
              <div style="margin-bottom:16px;">
                <span style="font-size:36px;line-height:1;">&#9835;</span>
              </div>
              <h1 style="margin:0;font-family:'Georgia','Times New Roman',serif;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">
                TuneFolio
              </h1>
              <p style="margin:8px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;color:rgba(255,255,255,0.7);letter-spacing:0.3px;">
                Your music lesson studio
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 16px;">

              <!-- Greeting -->
              <p style="margin:0 0 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:22px;font-weight:700;color:#3d2e1e;line-height:1.3;">
                You've been invited!
              </p>

              <p style="margin:0 0 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:16px;color:#5c4a38;line-height:1.6;">
                Hi ${studentName},
              </p>

              <p style="margin:0 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:16px;color:#5c4a38;line-height:1.6;">
                <strong style="color:#3d2e1e;">${teacherName}</strong> has invited you to join their studio on TuneFolio &mdash; the easiest way to manage your music lessons.
              </p>

            </td>
          </tr>

          <!-- Feature highlights -->
          <tr>
            <td style="padding:8px 40px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#faf7f4;border-radius:12px;border:1px solid #efe8e0;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:4px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;color:#5c4a38;line-height:1.5;">
                          <span style="color:#b8834a;font-size:16px;margin-right:8px;">&#10003;</span> Book lessons at times that work for you
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;color:#5c4a38;line-height:1.5;">
                          <span style="color:#b8834a;font-size:16px;margin-right:8px;">&#10003;</span> Track your lesson history and credits
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;color:#5c4a38;line-height:1.5;">
                          <span style="color:#b8834a;font-size:16px;margin-right:8px;">&#10003;</span> Manage everything in one place
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding:8px 40px 36px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="border-radius:10px;background-color:#b8834a;">
                    <a href="${inviteUrl}" target="_blank"
                       style="display:inline-block;padding:16px 48px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:17px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;letter-spacing:0.3px;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <div style="border-top:1px solid #efe8e0;"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px 32px;">
              <p style="margin:0 0 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;color:#a0917f;line-height:1.5;">
                This invitation expires in 30 days. If you have any questions about your lessons, please reach out to ${teacherName} directly.
              </p>
              <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;color:#c4b8aa;line-height:1.5;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card -->

        <!-- Sub-footer -->
        <table role="presentation" width="540" cellpadding="0" cellspacing="0" style="max-width:540px;width:100%;">
          <tr>
            <td align="center" style="padding:24px 16px 0;">
              <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;color:#b5a999;letter-spacing:0.3px;">
                Sent with &#9829; from TuneFolio
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
}
