-- Migration: Add ai_prompt field to dynamic_sections
-- This allows each section to have a custom AI prompt for content generation

ALTER TABLE dynamic_sections
ADD COLUMN IF NOT EXISTS ai_prompt TEXT;

COMMENT ON COLUMN dynamic_sections.ai_prompt IS 'Custom AI prompt template for generating content for items in this section';
