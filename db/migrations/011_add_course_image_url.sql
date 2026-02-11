-- Migration to add image_url column to courses table
-- Using LONGTEXT to support base64 encoded images
ALTER TABLE courses ADD COLUMN image_url LONGTEXT;
