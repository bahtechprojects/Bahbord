-- 029: Make sprint dates nullable (for planning sprints without dates yet)
ALTER TABLE sprints ALTER COLUMN start_date DROP NOT NULL;
ALTER TABLE sprints ALTER COLUMN end_date DROP NOT NULL;
