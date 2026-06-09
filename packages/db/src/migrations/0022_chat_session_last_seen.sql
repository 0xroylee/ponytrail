ALTER TABLE chat_sessions
	ADD COLUMN IF NOT EXISTS last_seen_at timestamp;

UPDATE chat_sessions
	SET last_seen_at = updated_at
	WHERE last_seen_at IS NULL;
