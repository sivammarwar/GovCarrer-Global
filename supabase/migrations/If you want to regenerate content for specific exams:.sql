-- Mark specific exam for regeneration
UPDATE exam_listings 
SET ai_content_generated = false, page_content = NULL
WHERE exam_name = 'UPSC Civil Services';

-- Mark all exams for regeneration (use carefully!)
UPDATE exam_listings 
SET ai_content_generated = false, page_content = NULL
WHERE is_active = true;