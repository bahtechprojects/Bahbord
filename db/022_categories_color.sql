-- 022: Add color column to categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#f59e0b';
