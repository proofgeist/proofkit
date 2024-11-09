export async function sendEmail({
  to,
  code,
  type,
}: {
  to: string;
  code: string;
  type: "verification" | "password-reset";
}) {
  // TODO: Customize this function to actually send the email to your users
  // Learn more: https://proofkit.dev/auth/proofkit

  console.warn("TODO: Customize this function to actually send to your users");
  console.log(`To ${to}: Your ${type} code is ${code}`);
}
