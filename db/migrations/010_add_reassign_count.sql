-- Add reassign_count column to student_tasks table
-- This tracks how many times a task has been reassigned to a student due to not meeting pass criteria

ALTER TABLE student_tasks ADD COLUMN IF NOT EXISTS reassign_count INT DEFAULT 0;
