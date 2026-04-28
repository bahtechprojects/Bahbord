-- 037: relaxa constraints legadas de notifications que causam falha silenciosa
-- - message: era NOT NULL (de 002), mas notificações novas podem ter só title
-- - type: era NOT NULL — manter, sempre passamos
-- - member_id: já foi relaxado em 030 (mas confirmar)

DO $$ BEGIN
  ALTER TABLE notifications ALTER COLUMN message DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Garante que member_id continua nullable (já era em 030 mas idempotente)
DO $$ BEGIN
  ALTER TABLE notifications ALTER COLUMN member_id DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Para todas as notifications criadas antes do recipient_id existir, garantir
-- que recipient_id está populado a partir de member_id
UPDATE notifications
SET recipient_id = member_id
WHERE recipient_id IS NULL AND member_id IS NOT NULL;
