-- Permettre aux utilisatrices alumni de révoquer leurs propres liens
-- d'invitation. Avant cette migration, seuls les admins pouvaient mettre
-- à jour la table invitation_links (policy invitation_links_update_admin),
-- ce qui empêchait l'utilisatrice de révoquer un lien partagé par erreur.
--
-- Sécurité :
--  - USING (inviter_id = auth.uid()) → ne peut update que SES liens
--  - WITH CHECK (inviter_id = auth.uid() AND is_revoked = true) → garantit
--    que le seul changement permis est is_revoked: false→true (pas d'autres
--    mutations frauduleuses, pas d'un-revoke).
--  - L'utilisatrice ne peut pas changer is_used, used_by, expires_at, etc.
--    (via RLS, le with_check rejette si is_revoked n'est pas true à la fin).
--
-- Note : la policy admin_update existante reste en place — admin peut toujours
-- révoquer n'importe quel lien.

CREATE POLICY invitation_links_revoke_own ON invitation_links
  FOR UPDATE
  TO authenticated
  USING (inviter_id = (SELECT auth.uid()))
  WITH CHECK (
    inviter_id = (SELECT auth.uid())
    AND is_revoked = true
  );
