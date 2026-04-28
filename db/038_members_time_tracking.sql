-- 038: Permite admin liberar Time Tracking pra usuário específico (sem ser admin)
-- Default: false. Admin libera explicitamente em Settings → Membros → toggle.
ALTER TABLE members ADD COLUMN IF NOT EXISTS can_track_time BOOLEAN DEFAULT false;
