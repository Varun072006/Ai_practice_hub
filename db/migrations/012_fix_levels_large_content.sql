-- Migration to fix levels table for large content
-- 1. Upgrade learning_materials from TEXT (64KB) to LONGTEXT (4GB) for base64 images
ALTER TABLE levels MODIFY COLUMN learning_materials LONGTEXT;

-- 2. Add image_url column to levels table (if it doesn't exist)
-- Using LONGTEXT to support base64 encoded images
ALTER TABLE levels ADD COLUMN image_url LONGTEXT;
