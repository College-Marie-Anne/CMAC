import { createClient } from "@/utils/supabase/server";
import { RegisterForm } from "@/components/auth/register-form";
import { InviteError } from "./invite-error";

type ValidationResult = {
  valid: boolean;
  reason: string | null;
  inviter_first_name: string | null;
  inviter_last_name: string | null;
  inviter_username: string | null;
};

export default async function InviteRegisterPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Pré-validation UUID côté serveur (évite requête DB inutile si format invalide)
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(token)) {
    return <InviteError reason="not_found" />;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("validate_invitation_token", {
    p_token: token,
  });

  if (error) {
    console.error("[invite] validate_invitation_token failed", error);
    return <InviteError reason="server_error" />;
  }

  const result = (Array.isArray(data) ? data[0] : data) as ValidationResult | undefined;

  if (!result || !result.valid) {
    return <InviteError reason={result?.reason ?? "not_found"} />;
  }

  const inviterName = [result.inviter_first_name, result.inviter_last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    <RegisterForm
      invitationToken={token}
      inviterName={inviterName || null}
      inviterUsername={result.inviter_username ?? null}
    />
  );
}
