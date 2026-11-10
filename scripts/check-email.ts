import { getMailTransporter } from "../src/lib/messaging/email";
import { AuthError } from "../src/lib/auth/errors";

async function main() {
  const transporter = getMailTransporter();
  try {
    await transporter.verify();
    console.log("SMTP connection and authentication passed. No email was sent.");
    console.log("Request a magic link in the app to test recipient delivery.");
  } finally {
    transporter.close();
  }
}

main().catch((error: unknown) => {
  if (error instanceof AuthError) {
    console.error(error.message);
  } else {
    const smtp = error as { code?: string; responseCode?: number } | null;
    console.error("SMTP verification failed.", {
      code: smtp?.code,
      responseCode: smtp?.responseCode,
    });
  }
  process.exitCode = 1;
});
