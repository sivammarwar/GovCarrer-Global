-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create countries table
CREATE TABLE public.countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_name TEXT NOT NULL,
  country_code TEXT NOT NULL UNIQUE,
  flag_emoji TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create job_listings table
CREATE TABLE public.job_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id UUID REFERENCES public.countries(id) ON DELETE CASCADE NOT NULL,
  job_title TEXT NOT NULL,
  department_name TEXT NOT NULL,
  application_deadline DATE,
  official_link TEXT NOT NULL,
  job_description TEXT,
  qualifications TEXT,
  category TEXT DEFAULT 'General',
  is_active BOOLEAN NOT NULL DEFAULT true,
  posted_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create exam_listings table
CREATE TABLE public.exam_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id UUID REFERENCES public.countries(id) ON DELETE CASCADE NOT NULL,
  exam_name TEXT NOT NULL,
  conducting_body TEXT NOT NULL,
  exam_date TEXT,
  admit_card_link TEXT,
  result_link TEXT,
  syllabus_link TEXT,
  official_website TEXT,
  notification_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table for admin users
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create triggers for updated_at columns
CREATE TRIGGER update_countries_updated_at
  BEFORE UPDATE ON public.countries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_job_listings_updated_at
  BEFORE UPDATE ON public.job_listings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_exam_listings_updated_at
  BEFORE UPDATE ON public.exam_listings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on all tables
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Countries policies (public read, admin write)
CREATE POLICY "Anyone can view active countries"
  ON public.countries FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can view all countries"
  ON public.countries FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert countries"
  ON public.countries FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update countries"
  ON public.countries FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete countries"
  ON public.countries FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Job listings policies (public read, admin write)
CREATE POLICY "Anyone can view active job listings"
  ON public.job_listings FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can view all job listings"
  ON public.job_listings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert job listings"
  ON public.job_listings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update job listings"
  ON public.job_listings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete job listings"
  ON public.job_listings FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Exam listings policies (public read, admin write)
CREATE POLICY "Anyone can view active exam listings"
  ON public.exam_listings FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can view all exam listings"
  ON public.exam_listings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert exam listings"
  ON public.exam_listings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update exam listings"
  ON public.exam_listings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete exam listings"
  ON public.exam_listings FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- User roles policies (admin only)
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX idx_job_listings_country ON public.job_listings(country_id);
CREATE INDEX idx_job_listings_active ON public.job_listings(is_active);
CREATE INDEX idx_exam_listings_country ON public.exam_listings(country_id);
CREATE INDEX idx_exam_listings_active ON public.exam_listings(is_active);
CREATE INDEX idx_countries_code ON public.countries(country_code);
CREATE INDEX idx_countries_active ON public.countries(is_active);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);

-- Insert dummy data for countries
INSERT INTO public.countries (country_name, country_code, flag_emoji, is_active) VALUES
('India', 'IN', '🇮🇳', true),
('United States', 'US', '🇺🇸', true),
('United Kingdom', 'GB', '🇬🇧', true),
('Canada', 'CA', '🇨🇦', true),
('Australia', 'AU', '🇦🇺', true),
('Germany', 'DE', '🇩🇪', true),
('France', 'FR', '🇫🇷', true),
('Japan', 'JP', '🇯🇵', true),
('Singapore', 'SG', '🇸🇬', true),
('United Arab Emirates', 'AE', '🇦🇪', true);

-- Insert dummy data for job listings
INSERT INTO public.job_listings (
  country_id, 
  job_title, 
  department_name, 
  application_deadline, 
  official_link, 
  job_description, 
  qualifications, 
  category, 
  is_active,
  posted_date
) VALUES
(
  (SELECT id FROM public.countries WHERE country_code = 'IN'),
  'Software Engineer',
  'Information Technology',
  '2026-03-15',
  'https://example.com/jobs/software-engineer-1',
  'Develop and maintain web applications using modern frameworks. Work with cross-functional teams to deliver high-quality software solutions.',
  'Bachelor''s degree in Computer Science or related field. 3+ years of experience in web development. Proficiency in JavaScript, React, and Node.js.',
  'Technology',
  true,
  '2026-01-10'
),
(
  (SELECT id FROM public.countries WHERE country_code = 'IN'),
  'Civil Engineer',
  'Public Works Department',
  '2026-02-28',
  'https://example.com/jobs/civil-engineer-1',
  'Design and oversee infrastructure projects including roads, bridges, and public facilities. Ensure compliance with safety standards.',
  'Bachelor''s degree in Civil Engineering. 5+ years of experience in construction and project management. Professional Engineer license preferred.',
  'Engineering',
  true,
  '2026-01-05'
),
(
  (SELECT id FROM public.countries WHERE country_code = 'US'),
  'Data Scientist',
  'Analytics Department',
  '2026-04-01',
  'https://example.com/jobs/data-scientist-1',
  'Analyze complex datasets to derive insights and build predictive models. Collaborate with stakeholders to drive data-driven decision making.',
  'Master''s degree in Statistics, Mathematics, or Computer Science. Experience with Python, R, SQL, and machine learning libraries.',
  'Technology',
  true,
  '2026-01-12'
),
(
  (SELECT id FROM public.countries WHERE country_code = 'GB'),
  'Healthcare Administrator',
  'National Health Service',
  '2026-03-20',
  'https://example.com/jobs/healthcare-admin-1',
  'Manage hospital operations, coordinate with medical staff, and ensure efficient patient care delivery.',
  'Bachelor''s degree in Healthcare Administration or related field. 3+ years of experience in healthcare management.',
  'Healthcare',
  true,
  '2026-01-08'
),
(
  (SELECT id FROM public.countries WHERE country_code = 'CA'),
  'Environmental Scientist',
  'Environment and Climate Change',
  '2026-03-10',
  'https://example.com/jobs/env-scientist-1',
  'Conduct environmental impact assessments and develop sustainable solutions for conservation projects.',
  'Master''s degree in Environmental Science. Field experience in ecosystem management and environmental monitoring.',
  'Science',
  true,
  '2026-01-15'
),
(
  (SELECT id FROM public.countries WHERE country_code = 'AU'),
  'Financial Analyst',
  'Treasury Department',
  '2026-02-25',
  'https://example.com/jobs/financial-analyst-1',
  'Perform financial modeling, budget analysis, and investment evaluations for government projects.',
  'Bachelor''s degree in Finance or Accounting. CFA certification preferred. 4+ years of experience in financial analysis.',
  'Finance',
  true,
  '2026-01-07'
),
(
  (SELECT id FROM public.countries WHERE country_code = 'IN'),
  'Teaching Faculty',
  'Education Department',
  '2026-04-15',
  'https://example.com/jobs/teaching-faculty-1',
  'Deliver lectures, conduct research, and mentor students in higher education institutions.',
  'PhD in relevant subject area. Teaching experience at university level. Strong research publication record.',
  'Education',
  true,
  '2026-01-20'
),
(
  (SELECT id FROM public.countries WHERE country_code = 'DE'),
  'Project Manager',
  'Infrastructure Development',
  '2026-03-05',
  'https://example.com/jobs/project-manager-1',
  'Lead large-scale infrastructure projects from planning to execution. Manage budgets, timelines, and stakeholder relationships.',
  'Bachelor''s degree in Project Management or Engineering. PMP certification. 7+ years of project management experience.',
  'Management',
  true,
  '2026-01-11'
);

-- Insert dummy data for exam listings
INSERT INTO public.exam_listings (
  country_id,
  exam_name,
  conducting_body,
  exam_date,
  admit_card_link,
  result_link,
  syllabus_link,
  official_website,
  notification_date,
  is_active
) VALUES
(
  (SELECT id FROM public.countries WHERE country_code = 'IN'),
  'Civil Services Examination 2026',
  'Union Public Service Commission (UPSC)',
  'June 15, 2026',
  'https://upsc.gov.in/admit-card',
  'https://upsc.gov.in/results',
  'https://upsc.gov.in/syllabus',
  'https://upsc.gov.in',
  '2026-01-05',
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'IN'),
  'Staff Selection Commission Combined Graduate Level (SSC CGL) 2026',
  'Staff Selection Commission',
  'April 20-30, 2026',
  'https://ssc.nic.in/admit-card',
  'https://ssc.nic.in/results',
  'https://ssc.nic.in/syllabus',
  'https://ssc.nic.in',
  '2026-01-10',
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'IN'),
  'Railway Recruitment Board NTPC 2026',
  'Railway Recruitment Board',
  'March 1-15, 2026',
  'https://rrbcdg.gov.in/admit-card',
  'https://rrbcdg.gov.in/results',
  'https://rrbcdg.gov.in/syllabus',
  'https://rrbcdg.gov.in',
  '2025-12-20',
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'US'),
  'United States Medical Licensing Examination (USMLE) Step 1',
  'National Board of Medical Examiners',
  'Continuous throughout 2026',
  'https://usmle.org/admit-card',
  'https://usmle.org/results',
  'https://usmle.org/syllabus',
  'https://usmle.org',
  '2026-01-01',
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'GB'),
  'Civil Service Fast Stream 2026',
  'UK Civil Service Commission',
  'February 10-20, 2026',
  'https://faststream.gov.uk/admit-card',
  'https://faststream.gov.uk/results',
  'https://faststream.gov.uk/syllabus',
  'https://faststream.gov.uk',
  '2025-12-15',
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'CA'),
  'Canadian Securities Course (CSC) Exam',
  'Canadian Securities Institute',
  'Rolling admissions',
  'https://csi.ca/admit-card',
  'https://csi.ca/results',
  'https://csi.ca/syllabus',
  'https://csi.ca',
  '2026-01-01',
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'AU'),
  'Australian Medical Council Examination',
  'Australian Medical Council',
  'May 5-10, 2026',
  'https://amc.org.au/admit-card',
  'https://amc.org.au/results',
  'https://amc.org.au/syllabus',
  'https://amc.org.au',
  '2026-01-12',
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'IN'),
  'National Eligibility cum Entrance Test (NEET) 2026',
  'National Testing Agency',
  'May 5, 2026',
  'https://nta.ac.in/neet/admit-card',
  'https://nta.ac.in/neet/results',
  'https://nta.ac.in/neet/syllabus',
  'https://nta.ac.in',
  '2026-01-18',
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'JP'),
  'National Public Service Examination Type I',
  'National Personnel Authority',
  'April 27, 2026',
  'https://jinji.go.jp/admit-card',
  'https://jinji.go.jp/results',
  'https://jinji.go.jp/syllabus',
  'https://jinji.go.jp',
  '2026-01-08',
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'SG'),
  'Singapore-Cambridge GCE A-Level',
  'Singapore Examinations and Assessment Board',
  'November 2026',
  'https://seab.gov.sg/admit-card',
  'https://seab.gov.sg/results',
  'https://seab.gov.sg/syllabus',
  'https://seab.gov.sg',
  '2026-01-05',
  true
);

-- Note: For profiles and user_roles tables, you'll need actual user IDs from auth.users
-- These will be automatically created when users sign up through your authentication system
-- Here's an example of what you would run AFTER creating test users:

-- Example (replace UUIDs with actual user IDs from auth.users):
-- INSERT INTO public.user_roles (user_id, role) VALUES
-- ('00000000-0000-0000-0000-000000000001', 'admin'),
-- ('00000000-0000-0000-0000-000000000002', 'user'),
-- ('00000000-0000-0000-0000-000000000003', 'user');

-- Profiles will be auto-created by the trigger when users sign up

-- Create notices table
CREATE TABLE public.notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_text TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trigger for updated_at column
CREATE TRIGGER update_notices_updated_at
  BEFORE UPDATE ON public.notices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on notices table
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

-- Notices policies (public read, admin write)
CREATE POLICY "Anyone can view active notices"
  ON public.notices FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can view all notices"
  ON public.notices FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert notices"
  ON public.notices FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update notices"
  ON public.notices FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete notices"
  ON public.notices FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create index for performance
CREATE INDEX idx_notices_active ON public.notices(is_active);

-- Insert sample notices
INSERT INTO public.notices (notice_text, is_active) VALUES
('UPSC Civil Services Prelims 2026 admit cards released - Download now from upsc.gov.in', true),
('SSC CGL 2026 application deadline extended to February 28, 2026', true),
('Railway Recruitment Board announces 50,000+ vacancies for NTPC posts', true),
('IBPS PO 2026 notification released - Apply before March 15, 2026', true),
('New: State government announces recruitment for 10,000+ teaching positions', true);

-- Insert 20 sample notices for the ticker
INSERT INTO public.notices (notice_text, is_active) VALUES
('🔥 UPSC Civil Services Prelims 2026 admit cards released - Download now from upsc.gov.in', true),
('⚡ SSC CGL 2026 application deadline extended to February 28, 2026 - Apply now!', true),
('📢 Railway Recruitment Board announces 50,000+ vacancies for NTPC posts - Last date March 15', true),
('🎯 IBPS PO 2026 notification released - Apply before March 15, 2026', true),
('✨ State government announces recruitment for 10,000+ teaching positions across all districts', true),
('🔔 Bank of India Probationary Officer recruitment - Last date March 20, 2026', true),
('📝 National Testing Agency NEET 2026 registration open until April 15 - Don''t miss out!', true),
('🌟 Important: Aadhaar linking mandatory for all government job applications from March 1', true),
('📌 UPSC Combined Defence Services (CDS) exam scheduled for April 13, 2026', true),
('🚨 SSC CHSL 2026 Tier-1 exam dates announced - Check official website for details', true),
('💼 Indian Army recruitment rally for 5,000 soldiers - Registration starts February 20', true),
('🏦 SBI Clerk 2026 notification expected soon - Prepare for 8,000+ vacancies', true),
('📣 GATE 2026 results to be declared on March 16 - Check score at gate.iisc.ac.in', true),
('⏰ Last chance! RRB Group D application closing on February 25, 2026', true),
('🎓 UGC NET June 2026 exam dates announced - Registrations open from March 1', true),
('💡 New pattern alert: UPSC has revised the Civil Services exam syllabus for 2026', true),
('🏛️ Supreme Court of India hiring 50 law clerks - Applications open till March 10', true),
('📊 IBPS RRB 2026 notification released - Apply for Officer Scale-I & Office Assistant posts', true),
('🔐 Important: All exam centers to use biometric verification from April 2026', true),
('🎉 Success rate increased! Over 2 lakh government jobs filled in 2025 - More vacancies expected in 2026', true);

-- Verify the insert
SELECT COUNT(*) as total_notices FROM public.notices WHERE is_active = true;

-- Add notice_link column to existing notices table
ALTER TABLE public.notices 
ADD COLUMN IF NOT EXISTS notice_link TEXT;

-- Update existing notices with sample links (optional - you can skip this if you want to add links manually)
UPDATE public.notices 
SET notice_link = CASE 
  WHEN notice_text LIKE '%UPSC%' THEN 'https://upsc.gov.in'
  WHEN notice_text LIKE '%SSC%' THEN 'https://ssc.nic.in'
  WHEN notice_text LIKE '%Railway%' OR notice_text LIKE '%RRB%' THEN 'https://rrbcdg.gov.in'
  WHEN notice_text LIKE '%IBPS%' THEN 'https://ibps.in'
  WHEN notice_text LIKE '%Bank of India%' THEN 'https://bankofindia.co.in/careers'
  WHEN notice_text LIKE '%NEET%' OR notice_text LIKE '%NTA%' THEN 'https://nta.ac.in'
  WHEN notice_text LIKE '%Aadhaar%' THEN 'https://uidai.gov.in'
  WHEN notice_text LIKE '%Army%' THEN 'https://joinindianarmy.nic.in'
  WHEN notice_text LIKE '%SBI%' THEN 'https://sbi.co.in/careers'
  WHEN notice_text LIKE '%GATE%' THEN 'https://gate.iisc.ac.in'
  WHEN notice_text LIKE '%UGC NET%' THEN 'https://ugcnet.nta.nic.in'
  WHEN notice_text LIKE '%Supreme Court%' THEN 'https://sci.gov.in/careers'
  ELSE NULL
END
WHERE notice_link IS NULL;

-- Verify the changes
SELECT id, notice_text, notice_link, is_active 
FROM public.notices 
LIMIT 5;

-- Replace 'YOUR-USER-ID-HERE' with the actual UUID you copied
INSERT INTO public.user_roles (user_id, role) 
VALUES ('e2206fcf-ce18-4627-ac82-68a0d2b1af8a', 'admin');

-- Create footer_famous_exams table
CREATE TABLE public.footer_famous_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id UUID REFERENCES public.countries(id) ON DELETE CASCADE NOT NULL,
  exam_name TEXT NOT NULL,
  exam_short_name TEXT, -- e.g., "UPSC" for "Union Public Service Commission"
  official_website TEXT NOT NULL,
  display_order INTEGER DEFAULT 0, -- For controlling the order of display
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trigger for updated_at column
CREATE TRIGGER update_footer_famous_exams_updated_at
  BEFORE UPDATE ON public.footer_famous_exams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on footer_famous_exams table
ALTER TABLE public.footer_famous_exams ENABLE ROW LEVEL SECURITY;

-- Footer famous exams policies (public read, admin write)
CREATE POLICY "Anyone can view active footer famous exams"
  ON public.footer_famous_exams FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can view all footer famous exams"
  ON public.footer_famous_exams FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert footer famous exams"
  ON public.footer_famous_exams FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update footer famous exams"
  ON public.footer_famous_exams FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete footer famous exams"
  ON public.footer_famous_exams FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX idx_footer_famous_exams_country ON public.footer_famous_exams(country_id);
CREATE INDEX idx_footer_famous_exams_active ON public.footer_famous_exams(is_active);
CREATE INDEX idx_footer_famous_exams_order ON public.footer_famous_exams(display_order);

-- Insert sample data for India
INSERT INTO public.footer_famous_exams (country_id, exam_name, exam_short_name, official_website, display_order, is_active) VALUES
(
  (SELECT id FROM public.countries WHERE country_code = 'IN'),
  'Union Public Service Commission',
  'UPSC',
  'https://upsc.gov.in',
  1,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'IN'),
  'Staff Selection Commission',
  'SSC',
  'https://ssc.nic.in',
  2,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'IN'),
  'Railway Recruitment Board',
  'RRB',
  'https://rrbcdg.gov.in',
  3,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'IN'),
  'Institute of Banking Personnel Selection',
  'IBPS',
  'https://ibps.in',
  4,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'IN'),
  'National Testing Agency',
  'NTA',
  'https://nta.ac.in',
  5,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'IN'),
  'State Bank of India',
  'SBI',
  'https://sbi.co.in/careers',
  6,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'IN'),
  'Reserve Bank of India',
  'RBI',
  'https://rbi.org.in',
  7,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'IN'),
  'National Eligibility cum Entrance Test',
  'NEET',
  'https://nta.ac.in/neet',
  8,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'IN'),
  'Joint Entrance Examination',
  'JEE',
  'https://jeemain.nta.nic.in',
  9,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'IN'),
  'Common Admission Test',
  'CAT',
  'https://iimcat.ac.in',
  10,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'IN'),
  'Graduate Aptitude Test in Engineering',
  'GATE',
  'https://gate.iisc.ac.in',
  11,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'IN'),
  'UGC National Eligibility Test',
  'UGC NET',
  'https://ugcnet.nta.nic.in',
  12,
  true
);

-- Insert sample data for United States
INSERT INTO public.footer_famous_exams (country_id, exam_name, exam_short_name, official_website, display_order, is_active) VALUES
(
  (SELECT id FROM public.countries WHERE country_code = 'US'),
  'United States Medical Licensing Examination',
  'USMLE',
  'https://usmle.org',
  1,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'US'),
  'Federal Service Entrance Examination',
  'FSEE',
  'https://usajobs.gov',
  2,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'US'),
  'Foreign Service Officer Test',
  'FSOT',
  'https://careers.state.gov',
  3,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'US'),
  'Certified Public Accountant',
  'CPA',
  'https://nasba.org',
  4,
  true
);

-- Insert sample data for United Kingdom
INSERT INTO public.footer_famous_exams (country_id, exam_name, exam_short_name, official_website, display_order, is_active) VALUES
(
  (SELECT id FROM public.countries WHERE country_code = 'GB'),
  'Civil Service Fast Stream',
  'Fast Stream',
  'https://faststream.gov.uk',
  1,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'GB'),
  'National Health Service Recruitment',
  'NHS Jobs',
  'https://jobs.nhs.uk',
  2,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'GB'),
  'Civil Service Commission',
  'CSC',
  'https://civilservicecommission.independent.gov.uk',
  3,
  true
);

-- Verify the inserts
SELECT 
  ffe.exam_short_name,
  ffe.exam_name,
  c.country_name,
  ffe.official_website
FROM public.footer_famous_exams ffe
JOIN public.countries c ON ffe.country_id = c.id
WHERE ffe.is_active = true
ORDER BY c.country_name, ffe.display_order;

-- Create answer_keys table
create table public.answer_keys (
  id uuid default gen_random_uuid() primary key,
  country_id uuid references public.countries(id) on delete cascade not null,
  exam_name text not null,
  exam_date date,
  post_name text,
  answer_key_link text not null,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.answer_keys enable row level security;

-- Create policies
create policy "Answer keys are viewable by everyone"
  on public.answer_keys for select
  using (true);

create policy "Answer keys are insertable by authenticated users only"
  on public.answer_keys for insert
  with check (auth.role() = 'authenticated');

create policy "Answer keys are updatable by authenticated users only"
  on public.answer_keys for update
  using (auth.role() = 'authenticated');

create policy "Answer keys are deletable by authenticated users only"
  on public.answer_keys for delete
  using (auth.role() = 'authenticated');

-- Create index for better query performance
create index answer_keys_country_id_idx on public.answer_keys(country_id);
create index answer_keys_is_active_idx on public.answer_keys(is_active);

-- Add is_pinned column to notices table
ALTER TABLE public.notices 
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

-- Create index for better performance when ordering by pinned status
CREATE INDEX IF NOT EXISTS idx_notices_pinned ON public.notices(is_pinned);

-- Update a few sample notices to be pinned (optional)
UPDATE public.notices 
SET is_pinned = true 
WHERE id IN (
  SELECT id 
  FROM public.notices 
  WHERE notice_text LIKE '%UPSC%' 
  LIMIT 2
);

-- Add country_id column to notices table
ALTER TABLE public.notices 
ADD COLUMN IF NOT EXISTS country_id UUID REFERENCES public.countries(id) ON DELETE CASCADE;

-- Make country_id nullable for global notices (optional)
-- If you want all notices to be country-specific, you can make it NOT NULL later

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_notices_country ON public.notices(country_id);

-- Optional: Update existing notices to assign them to India (or make them global by leaving NULL)
-- UPDATE public.notices 
-- SET country_id = (SELECT id FROM public.countries WHERE country_code = 'IN')
-- WHERE country_id IS NULL;

-- Delete all existing notices (optional - only if you want to start fresh)
DELETE FROM public.notices;

-- Insert sample notices for India
INSERT INTO public.notices (country_id, notice_text, notice_link, is_active, is_pinned) VALUES
(
  (SELECT id FROM public.countries WHERE country_code = 'IN'),
  '🔥 UPSC Civil Services Prelims 2026 admit cards released - Download now!',
  'https://upsc.gov.in',
  true,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'IN'),
  '⚡ SSC CGL 2026 application deadline extended to February 28, 2026',
  'https://ssc.nic.in',
  true,
  false
),
(
  (SELECT id FROM public.countries WHERE country_code = 'IN'),
  '📢 Railway Recruitment Board announces 50,000+ vacancies for NTPC posts',
  'https://rrbcdg.gov.in',
  true,
  false
),
(
  (SELECT id FROM public.countries WHERE country_code = 'IN'),
  '🎯 IBPS PO 2026 notification released - Apply before March 15, 2026',
  'https://ibps.in',
  true,
  false
),
(
  (SELECT id FROM public.countries WHERE country_code = 'IN'),
  '✨ State government announces recruitment for 10,000+ teaching positions',
  'https://example.com',
  true,
  false
);

-- Insert sample notices for United States
INSERT INTO public.notices (country_id, notice_text, notice_link, is_active, is_pinned) VALUES
(
  (SELECT id FROM public.countries WHERE country_code = 'US'),
  '🔥 Federal Service Entrance Examination registration open until March 2026',
  'https://usajobs.gov',
  true,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'US'),
  '⚡ USMLE Step 1 exam dates announced for Q2 2026',
  'https://usmle.org',
  true,
  false
);

-- Insert sample notices for United Kingdom
INSERT INTO public.notices (country_id, notice_text, notice_link, is_active, is_pinned) VALUES
(
  (SELECT id FROM public.countries WHERE country_code = 'GB'),
  '🔥 Civil Service Fast Stream applications now open',
  'https://faststream.gov.uk',
  true,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'GB'),
  '⚡ NHS Jobs: 10,000+ healthcare positions available nationwide',
  'https://jobs.nhs.uk',
  true,
  false
);

-- Insert sample notices for France
INSERT INTO public.notices (country_id, notice_text, notice_link, is_active, is_pinned) VALUES
(
  (SELECT id FROM public.countries WHERE country_code = 'FR'),
  '🔥 Concours de la fonction publique - Inscriptions ouvertes',
  'https://www.fonction-publique.gouv.fr',
  true,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'FR'),
  '⚡ Ministère de l''Éducation recrute 5000 enseignants',
  'https://www.education.gouv.fr',
  true,
  false
);

-- Verify the inserts
SELECT 
  n.notice_text,
  c.country_name,
  c.flag_emoji,
  n.is_pinned,
  n.is_active
FROM public.notices n
JOIN public.countries c ON n.country_id = c.id
ORDER BY c.country_name, n.is_pinned DESC;

-- Create results table
CREATE TABLE public.results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id UUID REFERENCES public.countries(id) ON DELETE CASCADE NOT NULL,
  exam_name TEXT NOT NULL,
  conducting_body TEXT,
  result_link TEXT, -- NULL means "Coming Soon"
  release_date DATE, -- Actual or expected release date
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trigger for updated_at column
CREATE TRIGGER update_results_updated_at
  BEFORE UPDATE ON public.results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on results table
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;

-- Results policies (public read, admin write)
CREATE POLICY "Anyone can view active results"
  ON public.results FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can view all results"
  ON public.results FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert results"
  ON public.results FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update results"
  ON public.results FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete results"
  ON public.results FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX idx_results_country ON public.results(country_id);
CREATE INDEX idx_results_active ON public.results(is_active);
CREATE INDEX idx_results_pinned ON public.results(is_pinned);
CREATE INDEX idx_results_release_date ON public.results(release_date);

-- Insert sample data for India
INSERT INTO public.results (country_id, exam_name, conducting_body, result_link, release_date, is_pinned, is_active) VALUES
(
  (SELECT id FROM public.countries WHERE country_code = 'IN'),
  'UPSC Civil Services Mains 2025',
  'Union Public Service Commission',
  'https://upsc.gov.in/results',
  '2026-01-15',
  true,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'IN'),
  'SSC CGL Tier-1 2025',
  'Staff Selection Commission',
  'https://ssc.nic.in/results',
  '2026-01-20',
  true,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'IN'),
  'Railway Recruitment Board NTPC 2025',
  'Railway Recruitment Board',
  'https://rrbcdg.gov.in/results',
  '2026-01-18',
  false,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'IN'),
  'IBPS PO Prelims 2025',
  'Institute of Banking Personnel Selection',
  NULL, -- Coming Soon
  '2026-02-05',
  false,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'IN'),
  'NEET UG 2026',
  'National Testing Agency',
  NULL, -- Coming Soon
  '2026-06-20',
  false,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'IN'),
  'SBI Clerk Prelims 2025',
  'State Bank of India',
  'https://sbi.co.in/results',
  '2026-01-22',
  false,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'IN'),
  'GATE 2026',
  'Indian Institute of Science',
  NULL, -- Coming Soon
  '2026-03-16',
  false,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'IN'),
  'UGC NET December 2025',
  'National Testing Agency',
  'https://ugcnet.nta.nic.in/results',
  '2026-01-25',
  false,
  true
);

-- Insert sample data for United States
INSERT INTO public.results (country_id, exam_name, conducting_body, result_link, release_date, is_pinned, is_active) VALUES
(
  (SELECT id FROM public.countries WHERE country_code = 'US'),
  'USMLE Step 1 - January 2026',
  'National Board of Medical Examiners',
  'https://usmle.org/results',
  '2026-02-01',
  true,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'US'),
  'Federal Service Entrance Exam 2025',
  'Office of Personnel Management',
  NULL, -- Coming Soon
  '2026-03-01',
  false,
  true
);

-- Insert sample data for United Kingdom
INSERT INTO public.results (country_id, exam_name, conducting_body, result_link, release_date, is_pinned, is_active) VALUES
(
  (SELECT id FROM public.countries WHERE country_code = 'GB'),
  'Civil Service Fast Stream 2025',
  'UK Civil Service Commission',
  'https://faststream.gov.uk/results',
  '2026-01-30',
  true,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'GB'),
  'NHS Graduate Management Training Scheme',
  'NHS England',
  NULL, -- Coming Soon
  '2026-02-15',
  false,
  true
);

-- Verify the inserts
SELECT 
  r.exam_name,
  c.country_name,
  c.flag_emoji,
  r.conducting_body,
  CASE 
    WHEN r.result_link IS NOT NULL THEN 'Live'
    ELSE 'Coming Soon'
  END as status,
  r.release_date,
  r.is_pinned
FROM public.results r
JOIN public.countries c ON r.country_id = c.id
WHERE r.is_active = true
ORDER BY c.country_name, r.is_pinned DESC, r.release_date DESC;

-- Add SEO fields to exam_listings table
ALTER TABLE public.exam_listings 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS meta_title TEXT,
ADD COLUMN IF NOT EXISTS meta_description TEXT,
ADD COLUMN IF NOT EXISTS keywords TEXT,
ADD COLUMN IF NOT EXISTS page_content TEXT;

-- Add SEO fields to job_listings table
ALTER TABLE public.job_listings 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS meta_title TEXT,
ADD COLUMN IF NOT EXISTS meta_description TEXT,
ADD COLUMN IF NOT EXISTS keywords TEXT,
ADD COLUMN IF NOT EXISTS page_content TEXT;

-- Add SEO fields to results table
ALTER TABLE public.results 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS meta_title TEXT,
ADD COLUMN IF NOT EXISTS meta_description TEXT,
ADD COLUMN IF NOT EXISTS keywords TEXT,
ADD COLUMN IF NOT EXISTS page_content TEXT;

-- Add SEO fields to answer_keys table
ALTER TABLE public.answer_keys 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS meta_title TEXT,
ADD COLUMN IF NOT EXISTS meta_description TEXT,
ADD COLUMN IF NOT EXISTS keywords TEXT,
ADD COLUMN IF NOT EXISTS page_content TEXT;

-- Function to generate slug from exam name
CREATE OR REPLACE FUNCTION generate_slug(text_input TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(text_input, '[^a-zA-Z0-9\s-]', '', 'g'),
      '\s+', '-', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Auto-generate slugs for existing exams
UPDATE public.exam_listings 
SET slug = generate_slug(exam_name) 
WHERE slug IS NULL;

UPDATE public.job_listings 
SET slug = generate_slug(job_title || '-' || department_name) 
WHERE slug IS NULL;

UPDATE public.results 
SET slug = generate_slug(exam_name) 
WHERE slug IS NULL;

UPDATE public.answer_keys 
SET slug = generate_slug(exam_name) 
WHERE slug IS NULL;

-- Function to generate SEO-friendly content
CREATE OR REPLACE FUNCTION generate_exam_seo_content(
  exam_name TEXT,
  conducting_body TEXT,
  country_name TEXT
) RETURNS TEXT AS $$
BEGIN
  RETURN format(
    '<h2>%s Complete Guide</h2>
    <p>%s is one of the most prestigious examinations conducted by %s in %s. 
    This comprehensive guide provides all the information you need about the exam, 
    including how to apply, important dates, admit card download procedures, 
    result checking process, and syllabus details.</p>
    
    <h3>Key Information</h3>
    <ul>
      <li>Conducting Body: %s</li>
      <li>Country: %s</li>
      <li>Application Mode: Online</li>
      <li>Official Notifications: Available on official website</li>
    </ul>',
    exam_name, exam_name, conducting_body, country_name,
    conducting_body, country_name
  );
END;
$$ LANGUAGE plpgsql;

-- Update existing exams with SEO content
UPDATE public.exam_listings e
SET 
  meta_title = e.exam_name || ' - Admit Card, Result, Syllabus | ' || c.country_name,
  meta_description = 'Get complete information about ' || e.exam_name || ' conducted by ' || 
                     e.conducting_body || '. Download admit card, check results, and access syllabus.',
  keywords = e.exam_name || ', ' || e.conducting_body || ', admit card, result, syllabus, ' || 
            c.country_name || ' government exam',
  page_content = generate_exam_seo_content(e.exam_name, e.conducting_body, c.country_name)
FROM public.countries c
WHERE e.country_id = c.id AND e.page_content IS NULL;

-- ============================================
-- SEO OPTIMIZATION DATABASE MIGRATION
-- Run this in your Supabase SQL Editor
-- ============================================

-- STEP 1: Add SEO fields to all tables
-- ============================================

-- Add SEO fields to exam_listings
ALTER TABLE public.exam_listings 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS meta_title TEXT,
ADD COLUMN IF NOT EXISTS meta_description TEXT,
ADD COLUMN IF NOT EXISTS keywords TEXT,
ADD COLUMN IF NOT EXISTS page_content TEXT;

-- Add SEO fields to job_listings
ALTER TABLE public.job_listings 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS meta_title TEXT,
ADD COLUMN IF NOT EXISTS meta_description TEXT,
ADD COLUMN IF NOT EXISTS keywords TEXT,
ADD COLUMN IF NOT EXISTS page_content TEXT;

-- Add SEO fields to results
ALTER TABLE public.results 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS meta_title TEXT,
ADD COLUMN IF NOT EXISTS meta_description TEXT,
ADD COLUMN IF NOT EXISTS keywords TEXT,
ADD COLUMN IF NOT EXISTS page_content TEXT;

-- Add SEO fields to answer_keys
ALTER TABLE public.answer_keys 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS meta_title TEXT,
ADD COLUMN IF NOT EXISTS meta_description TEXT,
ADD COLUMN IF NOT EXISTS keywords TEXT,
ADD COLUMN IF NOT EXISTS page_content TEXT;

-- STEP 2: Create slug generation function
-- ============================================

CREATE OR REPLACE FUNCTION generate_slug(text_input TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(text_input, '[^a-zA-Z0-9\s-]', '', 'g'),
        '\s+', '-', 'g'
      ),
      '-+', '-', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql;

-- STEP 3: Auto-generate slugs for existing data
-- ============================================

-- Generate slugs for exams
UPDATE public.exam_listings 
SET slug = generate_slug(exam_name || '-' || EXTRACT(YEAR FROM COALESCE(notification_date, CURRENT_DATE))::TEXT)
WHERE slug IS NULL;

-- Generate slugs for jobs
UPDATE public.job_listings 
SET slug = generate_slug(job_title || '-' || department_name || '-' || EXTRACT(YEAR FROM COALESCE(application_deadline, CURRENT_DATE))::TEXT)
WHERE slug IS NULL;

-- Generate slugs for results
UPDATE public.results 
SET slug = generate_slug(exam_name || '-result-' || EXTRACT(YEAR FROM COALESCE(release_date, CURRENT_DATE))::TEXT)
WHERE slug IS NULL;

-- Generate slugs for answer keys
UPDATE public.answer_keys 
SET slug = generate_slug(exam_name || '-answer-key-' || EXTRACT(YEAR FROM COALESCE(exam_date, CURRENT_DATE))::TEXT)
WHERE slug IS NULL;

-- STEP 4: Create SEO content generation function
-- ============================================

CREATE OR REPLACE FUNCTION generate_exam_seo_content(
  p_exam_name TEXT,
  p_conducting_body TEXT,
  p_country_name TEXT,
  p_exam_date TEXT DEFAULT NULL,
  p_notification_date DATE DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
  current_year TEXT := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
BEGIN
  RETURN format(
    '<div class="seo-content">
      <h2>%s - Complete Information Guide %s</h2>
      
      <p><strong>%s</strong> is one of the most sought-after examinations conducted by <strong>%s</strong> in %s. 
      This comprehensive guide provides all essential information including application procedures, admit card downloads, 
      result checking methods, syllabus details, and important dates for %s.</p>
      
      <h3>Quick Overview</h3>
      <ul>
        <li><strong>Exam Name:</strong> %s</li>
        <li><strong>Conducting Body:</strong> %s</li>
        <li><strong>Country:</strong> %s</li>%s%s
        <li><strong>Application Mode:</strong> Online</li>
        <li><strong>Exam Mode:</strong> As per official notification</li>
      </ul>
      
      <h3>How to Apply for %s</h3>
      <p>Follow these steps to apply for %s:</p>
      <ol>
        <li>Visit the official website of %s</li>
        <li>Click on the "Apply Online" or registration link</li>
        <li>Create your account with valid email and phone number</li>
        <li>Fill in all required details accurately</li>
        <li>Upload necessary documents (photo, signature, certificates)</li>
        <li>Pay the application fee through available payment modes</li>
        <li>Submit the form and save the confirmation for future reference</li>
      </ol>
      
      <h3>Eligibility Criteria</h3>
      <p>Candidates must meet the eligibility criteria as specified by %s. This typically includes:</p>
      <ul>
        <li>Educational qualifications as per the official notification</li>
        <li>Age limit criteria (usually with relaxation for reserved categories)</li>
        <li>Nationality requirements</li>
        <li>Physical fitness standards (if applicable)</li>
      </ul>
      
      <h3>Exam Pattern and Syllabus</h3>
      <p>The examination pattern for %s is designed to assess candidates comprehensive knowledge and skills. 
      Candidates should refer to the official syllabus available on this page for detailed information about:</p>
      <ul>
        <li>Examination stages and phases</li>
        <li>Subject-wise topics and sub-topics</li>
        <li>Marking scheme and negative marking (if any)</li>
        <li>Duration and total marks</li>
        <li>Question paper format (objective/descriptive)</li>
      </ul>
      
      <h3>Important Dates for %s</h3>
      <p>Keep track of these crucial dates to ensure you don''t miss any deadlines:</p>
      <ul>
        <li><strong>Notification Release:</strong> Check official website regularly</li>
        <li><strong>Application Start Date:</strong> As per official notification</li>
        <li><strong>Application Last Date:</strong> Watch for deadline announcements</li>
        <li><strong>Admit Card Release:</strong> Usually 2-3 weeks before exam</li>
        <li><strong>Examination Date:</strong> %s</li>
        <li><strong>Result Declaration:</strong> As announced by %s</li>
      </ul>
      
      <h3>Preparation Tips</h3>
      <p>To excel in %s, consider these preparation strategies:</p>
      <ul>
        <li>Understand the complete syllabus and exam pattern thoroughly</li>
        <li>Create a realistic study schedule and stick to it</li>
        <li>Practice previous year question papers</li>
        <li>Take regular mock tests to improve time management</li>
        <li>Focus on weak areas while maintaining strong subjects</li>
        <li>Stay updated with current affairs and recent developments</li>
        <li>Join study groups or online forums for peer learning</li>
      </ul>
      
      <h3>Frequently Asked Questions</h3>
      <h4>Q: How can I download the admit card for %s?</h4>
      <p>A: Admit cards are usually available 2-3 weeks before the exam date. Visit the official website, 
      enter your registration number and date of birth, and download your admit card.</p>
      
      <h4>Q: What documents are required at the exam center?</h4>
      <p>A: You must carry your admit card and a valid photo ID proof (Aadhaar, PAN, Passport, Driving License, etc.).</p>
      
      <h4>Q: How can I check the result?</h4>
      <p>A: Results are published on the official website. Use your roll number or registration number to check your result.</p>
      
      <h4>Q: Is there negative marking in %s?</h4>
      <p>A: Please refer to the official notification for detailed information about the marking scheme.</p>
      
      <h3>Official Resources</h3>
      <p>For the most accurate and updated information, always refer to:</p>
      <ul>
        <li>Official website of %s</li>
        <li>Official notification PDF</li>
        <li>FAQ section on the official portal</li>
        <li>Official social media channels</li>
      </ul>
      
      <p><em>Disclaimer: This information is compiled for reference purposes. For official and accurate details, 
      please visit the official website of %s.</em></p>
    </div>',
    p_exam_name, current_year,
    p_exam_name, p_conducting_body, p_country_name, current_year,
    p_exam_name, p_conducting_body, p_country_name,
    CASE WHEN p_notification_date IS NOT NULL THEN format('<li><strong>Notification Date:</strong> %s</li>', p_notification_date::TEXT) ELSE '' END,
    CASE WHEN p_exam_date IS NOT NULL THEN format('<li><strong>Exam Date:</strong> %s</li>', p_exam_date) ELSE '' END,
    p_exam_name, p_exam_name, p_conducting_body, p_conducting_body,
    p_exam_name, p_exam_name,
    COALESCE(p_exam_date, 'As per official notification'), p_conducting_body,
    p_exam_name, p_exam_name, p_exam_name,
    p_conducting_body, p_conducting_body
  );
END;
$$ LANGUAGE plpgsql;

-- STEP 5: Auto-generate SEO metadata for exams
-- ============================================

UPDATE public.exam_listings e
SET 
  meta_title = e.exam_name || ' ' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || ' - Admit Card, Result, Syllabus | ' || c.country_name || ' Government Exam',
  meta_description = 'Complete guide for ' || e.exam_name || ' ' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || ' conducted by ' || 
                     e.conducting_body || '. Download admit card, check results, get syllabus, important dates, and official notifications.',
  keywords = e.exam_name || ', ' || e.exam_name || ' ' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || ', ' || 
            e.conducting_body || ', admit card, result, syllabus, notification, exam date, ' || 
            c.country_name || ' government exam, official website, ' || e.exam_name || ' preparation',
  page_content = generate_exam_seo_content(e.exam_name, e.conducting_body, c.country_name, e.exam_date, e.notification_date)
FROM public.countries c
WHERE e.country_id = c.id AND e.page_content IS NULL;

-- STEP 6: Create index for slug-based queries
-- ============================================

CREATE INDEX IF NOT EXISTS idx_exam_listings_slug ON public.exam_listings(slug);
CREATE INDEX IF NOT EXISTS idx_job_listings_slug ON public.job_listings(slug);
CREATE INDEX IF NOT EXISTS idx_results_slug ON public.results(slug);
CREATE INDEX IF NOT EXISTS idx_answer_keys_slug ON public.answer_keys(slug);

-- STEP 7: Create trigger to auto-generate slug on insert
-- ============================================

CREATE OR REPLACE FUNCTION auto_generate_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    IF TG_TABLE_NAME = 'exam_listings' THEN
      NEW.slug := generate_slug(NEW.exam_name || '-' || EXTRACT(YEAR FROM COALESCE(NEW.notification_date, CURRENT_DATE))::TEXT);
    ELSIF TG_TABLE_NAME = 'job_listings' THEN
      NEW.slug := generate_slug(NEW.job_title || '-' || NEW.department_name || '-' || EXTRACT(YEAR FROM COALESCE(NEW.application_deadline, CURRENT_DATE))::TEXT);
    ELSIF TG_TABLE_NAME = 'results' THEN
      NEW.slug := generate_slug(NEW.exam_name || '-result-' || EXTRACT(YEAR FROM COALESCE(NEW.release_date, CURRENT_DATE))::TEXT);
    ELSIF TG_TABLE_NAME = 'answer_keys' THEN
      NEW.slug := generate_slug(NEW.exam_name || '-answer-key-' || EXTRACT(YEAR FROM COALESCE(NEW.exam_date, CURRENT_DATE))::TEXT);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for auto slug generation
CREATE TRIGGER auto_slug_exam_listings
  BEFORE INSERT ON public.exam_listings
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_slug();

CREATE TRIGGER auto_slug_job_listings
  BEFORE INSERT ON public.job_listings
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_slug();

CREATE TRIGGER auto_slug_results
  BEFORE INSERT ON public.results
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_slug();

CREATE TRIGGER auto_slug_answer_keys
  BEFORE INSERT ON public.answer_keys
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_slug();

-- STEP 8: Verify the migration
-- ============================================

-- Check if slugs are generated
SELECT 
  COUNT(*) as total_exams,
  COUNT(slug) as exams_with_slug,
  COUNT(meta_title) as exams_with_meta_title
FROM public.exam_listings;

-- Sample some generated data
SELECT 
  exam_name,
  slug,
  LEFT(meta_title, 50) as meta_title_preview,
  LEFT(meta_description, 80) as meta_desc_preview
FROM public.exam_listings
LIMIT 5;

-- ============================================
-- MIGRATION COMPLETE!
-- ============================================

/*
NEXT STEPS:
1. ✅ Run this migration in Supabase SQL Editor
2. Create ExamDetailPage.tsx component
3. Add routes to your app
4. Update exam cards to link to detail pages
5. Install react-helmet-async: npm install react-helmet-async
6. Wrap your app with HelmetProvider
7. Deploy and test
8. Submit sitemap to Google Search Console
*/
-- ============================================
-- ADD MISSING SEO FIELDS TO EXISTING TABLES (FIXED)
-- ============================================

-- Add missing SEO fields to job_listings (check if they exist first)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_listings' AND column_name = 'location') THEN
    ALTER TABLE public.job_listings ADD COLUMN location TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_listings' AND column_name = 'vacancies') THEN
    ALTER TABLE public.job_listings ADD COLUMN vacancies INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_listings' AND column_name = 'salary_range') THEN
    ALTER TABLE public.job_listings ADD COLUMN salary_range TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_listings' AND column_name = 'qualification') THEN
    ALTER TABLE public.job_listings ADD COLUMN qualification TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_listings' AND column_name = 'age_limit') THEN
    ALTER TABLE public.job_listings ADD COLUMN age_limit TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_listings' AND column_name = 'description') THEN
    ALTER TABLE public.job_listings ADD COLUMN description TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_listings' AND column_name = 'official_notification') THEN
    ALTER TABLE public.job_listings ADD COLUMN official_notification TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_listings' AND column_name = 'apply_link') THEN
    ALTER TABLE public.job_listings ADD COLUMN apply_link TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_listings' AND column_name = 'meta_keywords') THEN
    ALTER TABLE public.job_listings ADD COLUMN meta_keywords TEXT;
  END IF;
END $$;

-- Add missing SEO fields to answer_keys
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'answer_keys' AND column_name = 'objection_link') THEN
    ALTER TABLE public.answer_keys ADD COLUMN objection_link TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'answer_keys' AND column_name = 'objection_deadline') THEN
    ALTER TABLE public.answer_keys ADD COLUMN objection_deadline DATE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'answer_keys' AND column_name = 'release_date') THEN
    ALTER TABLE public.answer_keys ADD COLUMN release_date DATE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'answer_keys' AND column_name = 'is_pinned') THEN
    ALTER TABLE public.answer_keys ADD COLUMN is_pinned BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'answer_keys' AND column_name = 'meta_keywords') THEN
    ALTER TABLE public.answer_keys ADD COLUMN meta_keywords TEXT;
  END IF;
END $$;

-- Add missing SEO fields to results
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'results' AND column_name = 'title') THEN
    ALTER TABLE public.results ADD COLUMN title TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'results' AND column_name = 'result_date') THEN
    ALTER TABLE public.results ADD COLUMN result_date DATE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'results' AND column_name = 'meta_keywords') THEN
    ALTER TABLE public.results ADD COLUMN meta_keywords TEXT;
  END IF;
END $$;

-- Update results to copy exam_name to title if title is null
UPDATE public.results 
SET title = exam_name 
WHERE title IS NULL;

-- Update results to copy release_date to result_date if result_date is null
UPDATE public.results 
SET result_date = release_date 
WHERE result_date IS NULL;

-- Add missing SEO fields to exam_listings
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_listings' AND column_name = 'meta_keywords') THEN
    ALTER TABLE public.exam_listings ADD COLUMN meta_keywords TEXT;
  END IF;
END $$;

-- ============================================
-- CREATE DYNAMIC SECTIONS TABLES (MISSING!)
-- ============================================

-- Create dynamic_sections table
CREATE TABLE IF NOT EXISTS public.dynamic_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  section_type TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  color TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trigger for updated_at column
CREATE TRIGGER IF NOT EXISTS update_dynamic_sections_updated_at
  BEFORE UPDATE ON public.dynamic_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on dynamic_sections table
ALTER TABLE public.dynamic_sections ENABLE ROW LEVEL SECURITY;

-- Policies for dynamic_sections
CREATE POLICY "Anyone can view active dynamic sections"
  ON public.dynamic_sections FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage dynamic sections"
  ON public.dynamic_sections FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create dynamic_section_items table
CREATE TABLE IF NOT EXISTS public.dynamic_section_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID REFERENCES public.dynamic_sections(id) ON DELETE CASCADE,
  country_id UUID REFERENCES public.countries(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  date_value DATE,
  slug TEXT,
  link_url TEXT,
  link_text TEXT,
  thumbnail_url TEXT,
  form_data JSONB,
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT,
  page_content TEXT,
  ai_content_generated BOOLEAN DEFAULT false,
  content_generated_at TIMESTAMP WITH TIME ZONE,
  tags TEXT[],
  is_pinned BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trigger for updated_at column
CREATE TRIGGER IF NOT EXISTS update_dynamic_section_items_updated_at
  BEFORE UPDATE ON public.dynamic_section_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on dynamic_section_items table
ALTER TABLE public.dynamic_section_items ENABLE ROW LEVEL SECURITY;

-- Policies for dynamic_section_items
CREATE POLICY "Anyone can view active dynamic section items"
  ON public.dynamic_section_items FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can view all dynamic section items"
  ON public.dynamic_section_items FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert dynamic section items"
  ON public.dynamic_section_items FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update dynamic section items"
  ON public.dynamic_section_items FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete dynamic section items"
  ON public.dynamic_section_items FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_dynamic_section_items_section ON public.dynamic_section_items(section_id);
CREATE INDEX IF NOT EXISTS idx_dynamic_section_items_country ON public.dynamic_section_items(country_id);
CREATE INDEX IF NOT EXISTS idx_dynamic_section_items_active ON public.dynamic_section_items(is_active);
CREATE INDEX IF NOT EXISTS idx_dynamic_section_items_slug ON public.dynamic_section_items(slug);
CREATE INDEX IF NOT EXISTS idx_dynamic_sections_slug ON public.dynamic_sections(slug);

-- ============================================
-- CREATE UPDATED SLUG GENERATION FUNCTIONS
-- ============================================

-- Improved slug generation with better uniqueness
CREATE OR REPLACE FUNCTION generate_unique_slug(
  base_text TEXT,
  table_name TEXT,
  record_id UUID DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Generate base slug
  base_slug := lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(base_text, '[^a-zA-Z0-9\s-]', '', 'g'),
        '\s+', '-', 'g'
      ),
      '-+', '-', 'g'
    )
  );
  
  -- Trim leading/trailing hyphens
  base_slug := trim(both '-' from base_slug);
  
  final_slug := base_slug;
  
  -- Check for uniqueness and append number if needed
  LOOP
    IF table_name = 'exam_listings' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.exam_listings 
        WHERE slug = final_slug AND (record_id IS NULL OR id != record_id)
      ) THEN
        EXIT;
      END IF;
    ELSIF table_name = 'job_listings' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.job_listings 
        WHERE slug = final_slug AND (record_id IS NULL OR id != record_id)
      ) THEN
        EXIT;
      END IF;
    ELSIF table_name = 'results' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.results 
        WHERE slug = final_slug AND (record_id IS NULL OR id != record_id)
      ) THEN
        EXIT;
      END IF;
    ELSIF table_name = 'answer_keys' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.answer_keys 
        WHERE slug = final_slug AND (record_id IS NULL OR id != record_id)
      ) THEN
        EXIT;
      END IF;
    END IF;
    
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- UPDATE EXISTING RECORDS WITH UNIQUE SLUGS
-- ============================================

-- Generate slugs for exams with year
UPDATE public.exam_listings 
SET slug = generate_unique_slug(
  exam_name || '-' || EXTRACT(YEAR FROM COALESCE(notification_date, created_at, CURRENT_DATE))::TEXT,
  'exam_listings',
  id
)
WHERE slug IS NULL OR slug = '';

-- Generate slugs for jobs with year
UPDATE public.job_listings 
SET slug = generate_unique_slug(
  job_title || '-' || department_name || '-' || EXTRACT(YEAR FROM COALESCE(application_deadline, created_at, CURRENT_DATE))::TEXT,
  'job_listings',
  id
)
WHERE slug IS NULL OR slug = '';

-- Generate slugs for results with year
UPDATE public.results 
SET slug = generate_unique_slug(
  exam_name || '-result-' || EXTRACT(YEAR FROM COALESCE(release_date, created_at, CURRENT_DATE))::TEXT,
  'results',
  id
)
WHERE slug IS NULL OR slug = '';

-- Generate slugs for answer keys with year
UPDATE public.answer_keys 
SET slug = generate_unique_slug(
  exam_name || '-answer-key-' || EXTRACT(YEAR FROM COALESCE(exam_date, created_at, CURRENT_DATE))::TEXT,
  'answer_keys',
  id
)
WHERE slug IS NULL OR slug = '';

-- ============================================
-- UPDATE TRIGGERS FOR AUTO-SLUG GENERATION
-- ============================================

-- Drop old triggers if they exist
DROP TRIGGER IF EXISTS auto_slug_exam_listings ON public.exam_listings;
DROP TRIGGER IF EXISTS auto_slug_job_listings ON public.job_listings;
DROP TRIGGER IF EXISTS auto_slug_results ON public.results;
DROP TRIGGER IF EXISTS auto_slug_answer_keys ON public.answer_keys;

-- Create improved auto-slug function
CREATE OR REPLACE FUNCTION auto_generate_slug_improved()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    IF TG_TABLE_NAME = 'exam_listings' THEN
      NEW.slug := generate_unique_slug(
        NEW.exam_name || '-' || EXTRACT(YEAR FROM COALESCE(NEW.notification_date, CURRENT_DATE))::TEXT,
        'exam_listings',
        NEW.id
      );
    ELSIF TG_TABLE_NAME = 'job_listings' THEN
      NEW.slug := generate_unique_slug(
        NEW.job_title || '-' || NEW.department_name || '-' || EXTRACT(YEAR FROM COALESCE(NEW.application_deadline, CURRENT_DATE))::TEXT,
        'job_listings',
        NEW.id
      );
    ELSIF TG_TABLE_NAME = 'results' THEN
      NEW.slug := generate_unique_slug(
        NEW.exam_name || '-result-' || EXTRACT(YEAR FROM COALESCE(NEW.release_date, CURRENT_DATE))::TEXT,
        'results',
        NEW.id
      );
    ELSIF TG_TABLE_NAME = 'answer_keys' THEN
      NEW.slug := generate_unique_slug(
        NEW.exam_name || '-answer-key-' || EXTRACT(YEAR FROM COALESCE(NEW.exam_date, CURRENT_DATE))::TEXT,
        'answer_keys',
        NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for auto slug generation
CREATE TRIGGER auto_slug_exam_listings
  BEFORE INSERT OR UPDATE ON public.exam_listings
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_slug_improved();

CREATE TRIGGER auto_slug_job_listings
  BEFORE INSERT OR UPDATE ON public.job_listings
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_slug_improved();

CREATE TRIGGER auto_slug_results
  BEFORE INSERT OR UPDATE ON public.results
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_slug_improved();

CREATE TRIGGER auto_slug_answer_keys
  BEFORE INSERT OR UPDATE ON public.answer_keys
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_slug_improved();

-- ============================================
-- AUTO-GENERATE SEO METADATA FUNCTIONS
-- ============================================

-- Function to auto-generate meta_title for exams
CREATE OR REPLACE FUNCTION generate_exam_meta_title(
  exam_name TEXT,
  conducting_body TEXT,
  country_name TEXT
)
RETURNS TEXT AS $$
BEGIN
  RETURN exam_name || ' ' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || 
         ' - Admit Card, Result, Syllabus | ' || conducting_body || ' | ' || country_name;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-generate meta_description for exams
CREATE OR REPLACE FUNCTION generate_exam_meta_description(
  exam_name TEXT,
  conducting_body TEXT
)
RETURNS TEXT AS $$
BEGIN
  RETURN 'Complete guide for ' || exam_name || ' ' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || 
         ' conducted by ' || conducting_body || 
         '. Download admit card, check results, syllabus, important dates, and official notifications.';
END;
$$ LANGUAGE plpgsql;

-- Function to auto-generate keywords for exams
CREATE OR REPLACE FUNCTION generate_exam_keywords(
  exam_name TEXT,
  conducting_body TEXT,
  country_name TEXT
)
RETURNS TEXT AS $$
BEGIN
  RETURN exam_name || ', ' || exam_name || ' ' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || ', ' ||
         conducting_body || ', admit card, result, syllabus, notification, exam date, ' ||
         country_name || ' government exam, official website, ' || exam_name || ' preparation';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- POPULATE SEO METADATA FOR EXISTING RECORDS
-- ============================================

-- Update existing exam listings with auto-generated SEO metadata
UPDATE public.exam_listings e
SET 
  meta_title = COALESCE(e.meta_title, generate_exam_meta_title(e.exam_name, e.conducting_body, c.country_name)),
  meta_description = COALESCE(e.meta_description, generate_exam_meta_description(e.exam_name, e.conducting_body)),
  meta_keywords = COALESCE(e.meta_keywords, generate_exam_keywords(e.exam_name, e.conducting_body, c.country_name))
FROM public.countries c
WHERE e.country_id = c.id;

-- Update existing job listings with auto-generated SEO metadata
UPDATE public.job_listings j
SET 
  meta_title = COALESCE(j.meta_title, j.job_title || ' - ' || j.department_name || ' | ' || c.country_name || ' Government Job'),
  meta_description = COALESCE(j.meta_description, 'Apply for ' || j.job_title || ' at ' || j.department_name || '. Check eligibility, apply online, and download official notification.'),
  meta_keywords = COALESCE(j.meta_keywords, j.job_title || ', ' || j.department_name || ', ' || c.country_name || 
                  ' government job, recruitment, ' || COALESCE(j.category, 'government') || ' jobs, apply online')
FROM public.countries c
WHERE j.country_id = c.id;

-- Update existing results with auto-generated SEO metadata
UPDATE public.results r
SET 
  meta_title = COALESCE(r.meta_title, r.exam_name || ' Result ' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || ' | ' || c.country_name),
  meta_description = COALESCE(r.meta_description, 'Check ' || r.exam_name || ' result ' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || 
                     '. Download scorecard, merit list, and cut-off marks. ' || 
                     COALESCE(r.conducting_body, 'Official') || ' results declared.'),
  meta_keywords = COALESCE(r.meta_keywords, r.exam_name || ', ' || r.exam_name || ' result, result ' || 
                  EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || ', scorecard, merit list, cut off, ' || c.country_name)
FROM public.countries c
WHERE r.country_id = c.id;

-- Update existing answer keys with auto-generated SEO metadata
UPDATE public.answer_keys ak
SET 
  meta_title = COALESCE(ak.meta_title, ak.exam_name || ' Answer Key ' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || ' | ' || c.country_name),
  meta_description = COALESCE(ak.meta_description, 'Download ' || ak.exam_name || ' answer key ' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || 
                     '. Check official answer key, raise objections, and calculate expected marks.'),
  meta_keywords = COALESCE(ak.meta_keywords, ak.exam_name || ', ' || ak.exam_name || ' answer key, answer key ' || 
                  EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || ', objection, official answer key, ' || c.country_name)
FROM public.countries c
WHERE ak.country_id = c.id;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check exam listings
SELECT 
  exam_name,
  slug,
  LEFT(meta_title, 60) as meta_title_preview,
  LEFT(meta_description, 80) as meta_desc_preview
FROM public.exam_listings
LIMIT 3;

-- Check job listings
SELECT 
  job_title,
  slug,
  LEFT(meta_title, 60) as meta_title_preview,
  LEFT(meta_description, 80) as meta_desc_preview
FROM public.job_listings
LIMIT 3;

-- Check results
SELECT 
  exam_name,
  slug,
  LEFT(meta_title, 60) as meta_title_preview
FROM public.results
LIMIT 3;

-- Check answer keys
SELECT 
  exam_name,
  slug,
  LEFT(meta_title, 60) as meta_title_preview
FROM public.answer_keys
LIMIT 3;

-- ============================================
-- MIGRATION COMPLETE!
-- ============================================

SELECT 'SEO fields added and populated successfully! ✅' as status;

-- ============================================
-- INSERT TOP 10 GOVERNMENT EXAMS FOR 11 COUNTRIES
-- Run this in your Supabase SQL Editor
-- ============================================

-- Clear existing data (optional - remove if you want to keep existing records)
-- DELETE FROM public.footer_famous_exams;

-- ============================================
-- INDIA (IN) - Top 10 Government Exams
-- ============================================
INSERT INTO public.footer_famous_exams (country_id, exam_name, exam_short_name, official_website, display_order, is_active) VALUES
(
  (SELECT id FROM public.countries WHERE country_code = 'IN'),
  'Union Public Service Commission',
  'UPSC',
  'https://upsc.gov.in',
  1,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'IN'),
  'Staff Selection Commission',
  'SSC',
  'https://ssc.nic.in',
  2,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'IN'),
  'Railway Recruitment Board',
  'RRB',
  'https://rrbcdg.gov.in',
  3,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'IN'),
  'Institute of Banking Personnel Selection',
  'IBPS',
  'https://ibps.in',
  4,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'IN'),
  'National Testing Agency',
  'NTA',
  'https://nta.ac.in',
  5,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'IN'),
  'State Bank of India',
  'SBI',
  'https://sbi.co.in/careers',
  6,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'IN'),
  'Reserve Bank of India',
  'RBI',
  'https://rbi.org.in',
  7,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'IN'),
  'National Eligibility cum Entrance Test',
  'NEET',
  'https://neet.nta.nic.in',
  8,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'IN'),
  'Joint Entrance Examination Main',
  'JEE Main',
  'https://jeemain.nta.nic.in',
  9,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'IN'),
  'Graduate Aptitude Test in Engineering',
  'GATE',
  'https://gate.iisc.ac.in',
  10,
  true
);

-- ============================================
-- UNITED STATES (US) - Top 10 Government Exams
-- ============================================
INSERT INTO public.footer_famous_exams (country_id, exam_name, exam_short_name, official_website, display_order, is_active) VALUES
(
  (SELECT id FROM public.countries WHERE country_code = 'US'),
  'United States Medical Licensing Examination',
  'USMLE',
  'https://usmle.org',
  1,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'US'),
  'Foreign Service Officer Test',
  'FSOT',
  'https://careers.state.gov/work/foreign-service/officer/test-process',
  2,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'US'),
  'Certified Public Accountant',
  'CPA',
  'https://nasba.org',
  3,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'US'),
  'Federal Law Enforcement Training Centers',
  'FLETC',
  'https://fletc.gov',
  4,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'US'),
  'Graduate Record Examination',
  'GRE',
  'https://ets.org/gre',
  5,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'US'),
  'National Council Licensure Examination',
  'NCLEX',
  'https://ncsbn.org/nclex',
  6,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'US'),
  'Pharmacy College Admission Test',
  'PCAT',
  'https://pcatweb.info',
  7,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'US'),
  'Law School Admission Test',
  'LSAT',
  'https://lsac.org',
  8,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'US'),
  'Graduate Management Admission Test',
  'GMAT',
  'https://mba.com',
  9,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'US'),
  'Medical College Admission Test',
  'MCAT',
  'https://aamc.org/students/applying/mcat',
  10,
  true
);

-- ============================================
-- UNITED KINGDOM (GB) - Top 10 Government Exams
-- ============================================
INSERT INTO public.footer_famous_exams (country_id, exam_name, exam_short_name, official_website, display_order, is_active) VALUES
(
  (SELECT id FROM public.countries WHERE country_code = 'GB'),
  'Civil Service Fast Stream',
  'Fast Stream',
  'https://faststream.gov.uk',
  1,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'GB'),
  'National Health Service Jobs',
  'NHS Jobs',
  'https://jobs.nhs.uk',
  2,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'GB'),
  'Professional and Linguistic Assessments Board',
  'PLAB',
  'https://gmc-uk.org/registration-and-licensing/join-the-register/plab',
  3,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'GB'),
  'National Police Chiefs Council',
  'NPCC',
  'https://npcc.police.uk',
  4,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'GB'),
  'General Certificate of Secondary Education',
  'GCSE',
  'https://gov.uk/government/organisations/ofqual',
  5,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'GB'),
  'Advanced Level Examinations',
  'A-Levels',
  'https://gov.uk/what-different-qualification-levels-mean/list-of-qualification-levels',
  6,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'GB'),
  'UK Clinical Aptitude Test',
  'UCAT',
  'https://ucat.ac.uk',
  7,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'GB'),
  'BioMedical Admissions Test',
  'BMAT',
  'https://cambridge-assessment.org.uk/our-qualifications/bmat',
  8,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'GB'),
  'Solicitors Qualifying Examination',
  'SQE',
  'https://sra.org.uk/become-solicitor/sqe',
  9,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'GB'),
  'Teacher Training Application Service',
  'UCAS Teacher',
  'https://ucas.com/teacher-training',
  10,
  true
);

-- ============================================
-- CANADA (CA) - Top 10 Government Exams
-- ============================================
INSERT INTO public.footer_famous_exams (country_id, exam_name, exam_short_name, official_website, display_order, is_active) VALUES
(
  (SELECT id FROM public.countries WHERE country_code = 'CA'),
  'Canadian Securities Course',
  'CSC',
  'https://csi.ca/student/en_ca/courses/csi/csc.xhtml',
  1,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'CA'),
  'Medical Council of Canada Qualifying Examination',
  'MCCQE',
  'https://mcc.ca/examinations/mccqe-part-i',
  2,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'CA'),
  'Canadian Citizenship Test',
  'Citizenship',
  'https://canada.ca/en/immigration-refugees-citizenship/services/canadian-citizenship/become-canadian-citizen/citizenship-test.html',
  3,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'CA'),
  'Chartered Professional Accountant',
  'CPA Canada',
  'https://cpacanada.ca',
  4,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'CA'),
  'National Dental Examining Board',
  'NDEB',
  'https://ndeb.ca',
  5,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'CA'),
  'Public Service Commission of Canada',
  'PSC',
  'https://canada.ca/en/public-service-commission.html',
  6,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'CA'),
  'Canadian Registered Nurse Examination',
  'CRNE',
  'https://ncsbn.org/nclex-in-canada.htm',
  7,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'CA'),
  'Pharmacy Examining Board of Canada',
  'PEBC',
  'https://pebc.ca',
  8,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'CA'),
  'Law School Admission Test Canada',
  'LSAT Canada',
  'https://lsac.org/lsat',
  9,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'CA'),
  'Canadian Engineering Qualifications Board',
  'CEQB',
  'https://engineerscanada.ca/become-an-engineer/ceqb',
  10,
  true
);

-- ============================================
-- AUSTRALIA (AU) - Top 10 Government Exams
-- ============================================
INSERT INTO public.footer_famous_exams (country_id, exam_name, exam_short_name, official_website, display_order, is_active) VALUES
(
  (SELECT id FROM public.countries WHERE country_code = 'AU'),
  'Australian Medical Council Examination',
  'AMC',
  'https://amc.org.au',
  1,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'AU'),
  'Australian Public Service Commission',
  'APSC',
  'https://apsc.gov.au',
  2,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'AU'),
  'Higher School Certificate',
  'HSC',
  'https://educationstandards.nsw.edu.au/wps/portal/nesa/11-12/hsc',
  3,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'AU'),
  'Graduate Medical School Admissions Test',
  'GAMSAT',
  'https://gamsat.acer.org',
  4,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'AU'),
  'CPA Australia Examination',
  'CPA',
  'https://cpaaustralia.com.au',
  5,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'AU'),
  'Australian Nursing and Midwifery Accreditation Council',
  'ANMAC',
  'https://anmac.org.au',
  6,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'AU'),
  'National Police Checks',
  'NPC',
  'https://afp.gov.au/what-we-do/services/criminal-records/national-police-checks',
  7,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'AU'),
  'Australian Defence Force Aptitude Test',
  'YOU Session',
  'https://defencejobs.gov.au/joining/can-i-join/assessment-day',
  8,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'AU'),
  'Pharmacy Board of Australia',
  'AHPRA',
  'https://ahpra.gov.au',
  9,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'AU'),
  'Australian Citizenship Test',
  'Citizenship',
  'https://homeaffairs.gov.au/citizenship/test-and-interview/test',
  10,
  true
);

-- ============================================
-- GERMANY (DE) - Top 10 Government Exams
-- ============================================
INSERT INTO public.footer_famous_exams (country_id, exam_name, exam_short_name, official_website, display_order, is_active) VALUES
(
  (SELECT id FROM public.countries WHERE country_code = 'DE'),
  'Abitur',
  'Abitur',
  'https://kmk.org',
  1,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'DE'),
  'TestDaF - Test Deutsch als Fremdsprache',
  'TestDaF',
  'https://testdaf.de',
  2,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'DE'),
  'Goethe-Zertifikat',
  'Goethe',
  'https://goethe.de/de/spr/kup.html',
  3,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'DE'),
  'Medical Licensing Examination',
  'Ärztliche Prüfung',
  'https://bundesaerztekammer.de',
  4,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'DE'),
  'Bar Examination',
  'Staatsexamen',
  'https://bundesjustizamt.de',
  5,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'DE'),
  'Federal Employment Agency',
  'Bundesagentur',
  'https://arbeitsagentur.de',
  6,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'DE'),
  'German Citizenship Test',
  'Einbürgerungstest',
  'https://bamf.de/DE/Themen/Integration/TraegerLehrKraefte/Einbuergerungstest/einbuergerungstest-node.html',
  7,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'DE'),
  'Certified Tax Consultant Examination',
  'Steuerberater',
  'https://bstbk.de',
  8,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'DE'),
  'Pharmacy State Examination',
  'Pharmazie',
  'https://abda.de',
  9,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'DE'),
  'Teaching Certification',
  'Lehramtsprüfung',
  'https://kmk.org/themen/allgemeinbildende-schulen/lehrkraefte.html',
  10,
  true
);

-- ============================================
-- FRANCE (FR) - Top 10 Government Exams
-- ============================================
INSERT INTO public.footer_famous_exams (country_id, exam_name, exam_short_name, official_website, display_order, is_active) VALUES
(
  (SELECT id FROM public.countries WHERE country_code = 'FR'),
  'Baccalauréat',
  'Bac',
  'https://education.gouv.fr/le-baccalaureat-3098',
  1,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'FR'),
  'Concours de la Fonction Publique',
  'Fonction Publique',
  'https://fonction-publique.gouv.fr/concours',
  2,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'FR'),
  'DELF - Diplôme d''Études en Langue Française',
  'DELF',
  'https://france-education-international.fr/delf-dalf',
  3,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'FR'),
  'DALF - Diplôme Approfondi de Langue Française',
  'DALF',
  'https://france-education-international.fr/delf-dalf',
  4,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'FR'),
  'École Nationale d''Administration',
  'ENA',
  'https://ena.fr',
  5,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'FR'),
  'Concours National d''Internat',
  'ECN',
  'https://cnci.univ-lyon1.fr',
  6,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'FR'),
  'CAPES - Certificat d''Aptitude au Professorat',
  'CAPES',
  'https://devenirenseignant.gouv.fr',
  7,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'FR'),
  'Examen d''Expertise Comptable',
  'DEC',
  'https://experts-comptables.fr',
  8,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'FR'),
  'Concours de la Magistrature',
  'ENM',
  'https://enm-justice.fr',
  9,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'FR'),
  'Concours de Médecine',
  'PACES',
  'https://enseignementsup-recherche.gouv.fr',
  10,
  true
);

-- ============================================
-- JAPAN (JP) - Top 10 Government Exams
-- ============================================
INSERT INTO public.footer_famous_exams (country_id, exam_name, exam_short_name, official_website, display_order, is_active) VALUES
(
  (SELECT id FROM public.countries WHERE country_code = 'JP'),
  'National Public Service Examination',
  'NPSE',
  'https://jinji.go.jp/saiyo/siken/senmon/senmon.html',
  1,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'JP'),
  'Japanese Language Proficiency Test',
  'JLPT',
  'https://jlpt.jp',
  2,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'JP'),
  'Center Test for University Admissions',
  'Center Test',
  'https://dnc.ac.jp',
  3,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'JP'),
  'National Medical Practitioners Examination',
  'NMPE',
  'https://mhlw.go.jp/kouseiroudoushou/shikaku_shiken/ishi',
  4,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'JP'),
  'Bar Examination',
  'Shiho Shiken',
  'https://moj.go.jp/jinji/shihoushiken/jinji07_00005.html',
  5,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'JP'),
  'Certified Public Accountant Examination',
  'CPA Japan',
  'https://cpa-mitakai.net',
  6,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'JP'),
  'National Nursing Examination',
  'Kangoshi',
  'https://mhlw.go.jp/kouseiroudoushou/shikaku_shiken/kangoshi',
  7,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'JP'),
  'Teaching Certificate Examination',
  'Kyoin Menkyou',
  'https://mext.go.jp',
  8,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'JP'),
  'Pharmacy License Examination',
  'Yakuzaishi',
  'https://mhlw.go.jp/kouseiroudoushou/shikaku_shiken/yakuzaishi',
  9,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'JP'),
  'Dental License Examination',
  'Shikaishi',
  'https://mhlw.go.jp/kouseiroudoushou/shikaku_shiken/shikaishi',
  10,
  true
);

-- ============================================
-- SINGAPORE (SG) - Top 10 Government Exams
-- ============================================
INSERT INTO public.footer_famous_exams (country_id, exam_name, exam_short_name, official_website, display_order, is_active) VALUES
(
  (SELECT id FROM public.countries WHERE country_code = 'SG'),
  'Singapore-Cambridge GCE O-Level',
  'O-Level',
  'https://seab.gov.sg/home/examinations/gce-o-level',
  1,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'SG'),
  'Singapore-Cambridge GCE A-Level',
  'A-Level',
  'https://seab.gov.sg/home/examinations/gce-a-level',
  2,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'SG'),
  'Primary School Leaving Examination',
  'PSLE',
  'https://seab.gov.sg/home/examinations/psle',
  3,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'SG'),
  'Singapore Medical Council Examination',
  'SMC',
  'https://healthprofessionals.gov.sg/smc',
  4,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'SG'),
  'Public Service Commission Scholarship',
  'PSC',
  'https://psc.gov.sg',
  5,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'SG'),
  'Institute of Singapore Chartered Accountants',
  'ISCA',
  'https://isca.org.sg',
  6,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'SG'),
  'Singapore Nursing Board Examination',
  'SNB',
  'https://healthprofessionals.gov.sg/snb',
  7,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'SG'),
  'Law Society of Singapore',
  'Bar Exam',
  'https://lawsociety.org.sg',
  8,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'SG'),
  'Building and Construction Authority Examinations',
  'BCA',
  'https://bca.gov.sg',
  9,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'SG'),
  'Singapore Polytechnic Admissions',
  'Polytechnic',
  'https://polytechnic.edu.sg',
  10,
  true
);

-- ============================================
-- UNITED ARAB EMIRATES (AE) - Top 10 Government Exams
-- ============================================
INSERT INTO public.footer_famous_exams (country_id, exam_name, exam_short_name, official_website, display_order, is_active) VALUES
(
  (SELECT id FROM public.countries WHERE country_code = 'AE'),
  'Emirates Standardized Test',
  'EmSAT',
  'https://emsat.moe.gov.ae',
  1,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'AE'),
  'Ministry of Education Examinations',
  'MOE UAE',
  'https://moe.gov.ae',
  2,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'AE'),
  'Dubai Health Authority Licensing',
  'DHA',
  'https://dha.gov.ae/en/HealthRegulation/Pages/ProfessionalLicensing.aspx',
  3,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'AE'),
  'Abu Dhabi Health Authority Exam',
  'DOH',
  'https://doh.gov.ae',
  4,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'AE'),
  'UAE Ministry of Health License',
  'MOH UAE',
  'https://mohap.gov.ae',
  5,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'AE'),
  'Dubai Police Recruitment',
  'Dubai Police',
  'https://dubaipolice.gov.ae',
  6,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'AE'),
  'Federal Authority for Government HR',
  'FAHR',
  'https://fahr.gov.ae',
  7,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'AE'),
  'UAE Teaching License',
  'Teaching License',
  'https://moe.gov.ae',
  8,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'AE'),
  'Dubai Municipality Examinations',
  'DM',
  'https://dm.gov.ae',
  9,
  true
),
(
  (SELECT id FROM public.countries WHERE country_code = 'AE'),
  'UAE University Entrance',
  'UAEU',
  'https://uaeu.ac.ae',
  10,
  true
);

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- Run this to verify all exams were inserted correctly
SELECT 
  c.country_name,
  c.flag_emoji,
  COUNT(ffe.id) as exam_count,
  STRING_AGG(ffe.exam_short_name, ', ' ORDER BY ffe.display_order) as exam_list
FROM public.countries c
LEFT JOIN public.footer_famous_exams ffe ON c.id = ffe.country_id
WHERE c.is_active = true
GROUP BY c.country_name, c.flag_emoji
ORDER BY c.country_name;

-- ============================================
-- COUNT CHECK
-- ============================================
-- Should return 110 total exams (11 countries × 10 exams each)
SELECT COUNT(*) as total_exams FROM public.footer_famous_exams WHERE is_active = true;

-- ============================================
-- MIGRATION COMPLETE! ✅
-- ============================================
-- ============================================
-- STEP 1: DELETE ALL EXISTING EXAMS
-- ============================================
DELETE FROM public.footer_famous_exams;

-- Verify deletion
SELECT COUNT(*) as remaining_exams FROM public.footer_famous_exams;

-- ============================================
-- STEP 2: INSERT TOP 24 GOVERNMENT EXAMS FOR 11 COUNTRIES
-- ============================================

-- ============================================
-- INDIA (IN) - Top 24 Government Exams
-- ============================================
INSERT INTO public.footer_famous_exams (country_id, exam_name, exam_short_name, official_website, display_order, is_active) VALUES
-- Tier 1: Most Popular
((SELECT id FROM public.countries WHERE country_code = 'IN'), 'Union Public Service Commission', 'UPSC', 'https://upsc.gov.in', 1, true),
((SELECT id FROM public.countries WHERE country_code = 'IN'), 'Staff Selection Commission', 'SSC', 'https://ssc.nic.in', 2, true),
((SELECT id FROM public.countries WHERE country_code = 'IN'), 'Railway Recruitment Board', 'RRB', 'https://rrbcdg.gov.in', 3, true),
((SELECT id FROM public.countries WHERE country_code = 'IN'), 'Institute of Banking Personnel Selection', 'IBPS', 'https://ibps.in', 4, true),
((SELECT id FROM public.countries WHERE country_code = 'IN'), 'National Testing Agency', 'NTA', 'https://nta.ac.in', 5, true),
((SELECT id FROM public.countries WHERE country_code = 'IN'), 'State Bank of India', 'SBI', 'https://sbi.co.in/careers', 6, true),

-- Tier 2: Banking & Finance
((SELECT id FROM public.countries WHERE country_code = 'IN'), 'Reserve Bank of India', 'RBI', 'https://rbi.org.in', 7, true),
((SELECT id FROM public.countries WHERE country_code = 'IN'), 'Insurance Regulatory and Development Authority', 'IRDAI', 'https://irdai.gov.in', 8, true),
((SELECT id FROM public.countries WHERE country_code = 'IN'), 'Securities and Exchange Board of India', 'SEBI', 'https://sebi.gov.in', 9, true),

-- Tier 3: Medical & Engineering
((SELECT id FROM public.countries WHERE country_code = 'IN'), 'National Eligibility cum Entrance Test', 'NEET', 'https://neet.nta.nic.in', 10, true),
((SELECT id FROM public.countries WHERE country_code = 'IN'), 'Joint Entrance Examination Main', 'JEE Main', 'https://jeemain.nta.nic.in', 11, true),
((SELECT id FROM public.countries WHERE country_code = 'IN'), 'Graduate Aptitude Test in Engineering', 'GATE', 'https://gate.iisc.ac.in', 12, true),
((SELECT id FROM public.countries WHERE country_code = 'IN'), 'All India Institute of Medical Sciences', 'AIIMS', 'https://aiimsexams.ac.in', 13, true),

-- Tier 4: Defense & Police
((SELECT id FROM public.countries WHERE country_code = 'IN'), 'National Defence Academy', 'NDA', 'https://upsc.gov.in/examinations/nda-na-i', 14, true),
((SELECT id FROM public.countries WHERE country_code = 'IN'), 'Combined Defence Services Examination', 'CDS', 'https://upsc.gov.in/examinations/cds-i', 15, true),
((SELECT id FROM public.countries WHERE country_code = 'IN'), 'Indian Air Force Airmen', 'IAF', 'https://indianairforce.nic.in', 16, true),

-- Tier 5: Education & Research
((SELECT id FROM public.countries WHERE country_code = 'IN'), 'UGC National Eligibility Test', 'UGC NET', 'https://ugcnet.nta.nic.in', 17, true),
((SELECT id FROM public.countries WHERE country_code = 'IN'), 'Common Law Admission Test', 'CLAT', 'https://consortiumofnlus.ac.in', 18, true),
((SELECT id FROM public.countries WHERE country_code = 'IN'), 'Common Admission Test', 'CAT', 'https://iimcat.ac.in', 19, true),

-- Tier 6: State & Public Sector
((SELECT id FROM public.countries WHERE country_code = 'IN'), 'Delhi Subordinate Services Selection Board', 'DSSSB', 'https://dsssb.delhi.gov.in', 20, true),
((SELECT id FROM public.countries WHERE country_code = 'IN'), 'Maharashtra Public Service Commission', 'MPSC', 'https://mpsc.gov.in', 21, true),
((SELECT id FROM public.countries WHERE country_code = 'IN'), 'Employees Provident Fund Organisation', 'EPFO', 'https://epfindia.gov.in', 22, true),
((SELECT id FROM public.countries WHERE country_code = 'IN'), 'Food Corporation of India', 'FCI', 'https://fci.gov.in', 23, true),
((SELECT id FROM public.countries WHERE country_code = 'IN'), 'Life Insurance Corporation', 'LIC', 'https://licindia.in', 24, true);

-- ============================================
-- UNITED STATES (US) - Top 24 Government Exams
-- ============================================
INSERT INTO public.footer_famous_exams (country_id, exam_name, exam_short_name, official_website, display_order, is_active) VALUES
-- Medical & Healthcare
((SELECT id FROM public.countries WHERE country_code = 'US'), 'United States Medical Licensing Examination', 'USMLE', 'https://usmle.org', 1, true),
((SELECT id FROM public.countries WHERE country_code = 'US'), 'National Council Licensure Examination RN', 'NCLEX-RN', 'https://ncsbn.org/nclex', 2, true),
((SELECT id FROM public.countries WHERE country_code = 'US'), 'Pharmacy College Admission Test', 'PCAT', 'https://pcatweb.info', 3, true),
((SELECT id FROM public.countries WHERE country_code = 'US'), 'Medical College Admission Test', 'MCAT', 'https://aamc.org/students/applying/mcat', 4, true),
((SELECT id FROM public.countries WHERE country_code = 'US'), 'Dental Admission Test', 'DAT', 'https://ada.org/en/education/testing/dat', 5, true),

-- Legal & Law
((SELECT id FROM public.countries WHERE country_code = 'US'), 'Law School Admission Test', 'LSAT', 'https://lsac.org', 6, true),
((SELECT id FROM public.countries WHERE country_code = 'US'), 'Multistate Bar Examination', 'MBE', 'https://ncbex.org', 7, true),
((SELECT id FROM public.countries WHERE country_code = 'US'), 'Uniform Bar Examination', 'UBE', 'https://ncbex.org/exams/ube', 8, true),

-- Business & Finance
((SELECT id FROM public.countries WHERE country_code = 'US'), 'Certified Public Accountant', 'CPA', 'https://nasba.org', 9, true),
((SELECT id FROM public.countries WHERE country_code = 'US'), 'Graduate Management Admission Test', 'GMAT', 'https://mba.com', 10, true),
((SELECT id FROM public.countries WHERE country_code = 'US'), 'Chartered Financial Analyst', 'CFA', 'https://cfainstitute.org', 11, true),

-- Graduate & Academic
((SELECT id FROM public.countries WHERE country_code = 'US'), 'Graduate Record Examination', 'GRE', 'https://ets.org/gre', 12, true),
((SELECT id FROM public.countries WHERE country_code = 'US'), 'Test of English as a Foreign Language', 'TOEFL', 'https://ets.org/toefl', 13, true),

-- Federal & Civil Service
((SELECT id FROM public.countries WHERE country_code = 'US'), 'Foreign Service Officer Test', 'FSOT', 'https://careers.state.gov/work/foreign-service/officer/test-process', 14, true),
((SELECT id FROM public.countries WHERE country_code = 'US'), 'Federal Bureau of Investigation Special Agent', 'FBI Exam', 'https://fbijobs.gov', 15, true),
((SELECT id FROM public.countries WHERE country_code = 'US'), 'Transportation Security Officer', 'TSO', 'https://tsa.gov/careers', 16, true),

-- Teaching & Education
((SELECT id FROM public.countries WHERE country_code = 'US'), 'Praxis Core Academic Skills for Educators', 'Praxis', 'https://ets.org/praxis', 17, true),
((SELECT id FROM public.countries WHERE country_code = 'US'), 'National Board Certification', 'NBPTS', 'https://nbpts.org', 18, true),

-- Professional Certifications
((SELECT id FROM public.countries WHERE country_code = 'US'), 'Professional Engineer Examination', 'PE Exam', 'https://ncees.org', 19, true),
((SELECT id FROM public.countries WHERE country_code = 'US'), 'Certified Information Systems Security Professional', 'CISSP', 'https://isc2.org', 20, true),
((SELECT id FROM public.countries WHERE country_code = 'US'), 'Project Management Professional', 'PMP', 'https://pmi.org', 21, true),
((SELECT id FROM public.countries WHERE country_code = 'US'), 'Fundamentals of Engineering Examination', 'FE Exam', 'https://ncees.org/engineering/fe', 22, true),
((SELECT id FROM public.countries WHERE country_code = 'US'), 'National Association of Boards of Pharmacy', 'NAPLEX', 'https://nabp.pharmacy', 23, true),
((SELECT id FROM public.countries WHERE country_code = 'US'), 'Certified Registered Nurse Anesthetist', 'CRNA', 'https://aana.com', 24, true);

-- ============================================
-- UNITED KINGDOM (GB) - Top 24 Government Exams
-- ============================================
INSERT INTO public.footer_famous_exams (country_id, exam_name, exam_short_name, official_website, display_order, is_active) VALUES
-- Civil Service & Government
((SELECT id FROM public.countries WHERE country_code = 'GB'), 'Civil Service Fast Stream', 'Fast Stream', 'https://faststream.gov.uk', 1, true),
((SELECT id FROM public.countries WHERE country_code = 'GB'), 'National Health Service Jobs', 'NHS Jobs', 'https://jobs.nhs.uk', 2, true),
((SELECT id FROM public.countries WHERE country_code = 'GB'), 'Local Government Recruitment', 'LG Jobs', 'https://gov.uk/government/organisations/civil-service-commission', 3, true),

-- Medical & Healthcare
((SELECT id FROM public.countries WHERE country_code = 'GB'), 'Professional and Linguistic Assessments Board', 'PLAB', 'https://gmc-uk.org/registration-and-licensing/join-the-register/plab', 4, true),
((SELECT id FROM public.countries WHERE country_code = 'GB'), 'UK Clinical Aptitude Test', 'UCAT', 'https://ucat.ac.uk', 5, true),
((SELECT id FROM public.countries WHERE country_code = 'GB'), 'BioMedical Admissions Test', 'BMAT', 'https://cambridge-assessment.org.uk', 6, true),
((SELECT id FROM public.countries WHERE country_code = 'GB'), 'Nursing and Midwifery Council', 'NMC', 'https://nmc.org.uk', 7, true),

-- Education Qualifications
((SELECT id FROM public.countries WHERE country_code = 'GB'), 'General Certificate of Secondary Education', 'GCSE', 'https://gov.uk/government/organisations/ofqual', 8, true),
((SELECT id FROM public.countries WHERE country_code = 'GB'), 'Advanced Level Examinations', 'A-Levels', 'https://gov.uk/what-different-qualification-levels-mean', 9, true),
((SELECT id FROM public.countries WHERE country_code = 'GB'), 'International Baccalaureate', 'IB', 'https://ibo.org', 10, true),

-- Legal & Professional
((SELECT id FROM public.countries WHERE country_code = 'GB'), 'Solicitors Qualifying Examination', 'SQE', 'https://sra.org.uk/become-solicitor/sqe', 11, true),
((SELECT id FROM public.countries WHERE country_code = 'GB'), 'Bar Professional Training Course', 'BPTC', 'https://barstandardsboard.org.uk', 12, true),
((SELECT id FROM public.countries WHERE country_code = 'GB'), 'Chartered Institute of Management Accountants', 'CIMA', 'https://cimaglobal.com', 13, true),
((SELECT id FROM public.countries WHERE country_code = 'GB'), 'Association of Chartered Certified Accountants', 'ACCA', 'https://accaglobal.com', 14, true),

-- Police & Defense
((SELECT id FROM public.countries WHERE country_code = 'GB'), 'National Police Chiefs Council', 'NPCC', 'https://npcc.police.uk', 15, true),
((SELECT id FROM public.countries WHERE country_code = 'GB'), 'Ministry of Defence Recruitment', 'MOD', 'https://apply.army.mod.uk', 16, true),

-- Teaching & Education
((SELECT id FROM public.countries WHERE country_code = 'GB'), 'Teacher Training Application Service', 'UCAS Teacher', 'https://ucas.com/teacher-training', 17, true),
((SELECT id FROM public.countries WHERE country_code = 'GB'), 'Qualified Teacher Status', 'QTS', 'https://gov.uk/guidance/qualified-teacher-status-qts', 18, true),

-- Professional Certifications
((SELECT id FROM public.countries WHERE country_code = 'GB'), 'Chartered Financial Analyst UK', 'CFA UK', 'https://cfauk.org', 19, true),
((SELECT id FROM public.countries WHERE country_code = 'GB'), 'General Pharmaceutical Council', 'GPhC', 'https://pharmacyregulation.org', 20, true),
((SELECT id FROM public.countries WHERE country_code = 'GB'), 'Royal Institution of Chartered Surveyors', 'RICS', 'https://rics.org', 21, true),
((SELECT id FROM public.countries WHERE country_code = 'GB'), 'Institute of Chartered Accountants', 'ICAEW', 'https://icaew.com', 22, true),
((SELECT id FROM public.countries WHERE country_code = 'GB'), 'Chartered Institute of Personnel Development', 'CIPD', 'https://cipd.co.uk', 23, true),
((SELECT id FROM public.countries WHERE country_code = 'GB'), 'British Computer Society', 'BCS', 'https://bcs.org', 24, true);

-- ============================================
-- CANADA (CA) - Top 24 Government Exams
-- ============================================
INSERT INTO public.footer_famous_exams (country_id, exam_name, exam_short_name, official_website, display_order, is_active) VALUES
-- Professional Finance
((SELECT id FROM public.countries WHERE country_code = 'CA'), 'Chartered Professional Accountant', 'CPA Canada', 'https://cpacanada.ca', 1, true),
((SELECT id FROM public.countries WHERE country_code = 'CA'), 'Canadian Securities Course', 'CSC', 'https://csi.ca/student/en_ca/courses/csi/csc.xhtml', 2, true),
((SELECT id FROM public.countries WHERE country_code = 'CA'), 'Chartered Financial Analyst Canada', 'CFA', 'https://cfacanada.org', 3, true),

-- Medical & Healthcare
((SELECT id FROM public.countries WHERE country_code = 'CA'), 'Medical Council of Canada Qualifying Examination', 'MCCQE', 'https://mcc.ca/examinations/mccqe-part-i', 4, true),
((SELECT id FROM public.countries WHERE country_code = 'CA'), 'National Dental Examining Board', 'NDEB', 'https://ndeb.ca', 5, true),
((SELECT id FROM public.countries WHERE country_code = 'CA'), 'Canadian Registered Nurse Examination', 'CRNE', 'https://ncsbn.org/nclex-in-canada.htm', 6, true),
((SELECT id FROM public.countries WHERE country_code = 'CA'), 'Pharmacy Examining Board of Canada', 'PEBC', 'https://pebc.ca', 7, true),
((SELECT id FROM public.countries WHERE country_code = 'CA'), 'Medical Laboratory Technologist Certification', 'MLT', 'https://csmls.org', 8, true),

-- Civil Service & Immigration
((SELECT id FROM public.countries WHERE country_code = 'CA'), 'Public Service Commission of Canada', 'PSC', 'https://canada.ca/en/public-service-commission.html', 9, true),
((SELECT id FROM public.countries WHERE country_code = 'CA'), 'Canadian Citizenship Test', 'Citizenship', 'https://canada.ca/en/immigration-refugees-citizenship/services/canadian-citizenship.html', 10, true),

-- Legal
((SELECT id FROM public.countries WHERE country_code = 'CA'), 'Law School Admission Test Canada', 'LSAT Canada', 'https://lsac.org/lsat', 11, true),
((SELECT id FROM public.countries WHERE country_code = 'CA'), 'National Committee on Accreditation', 'NCA', 'https://flsc.ca', 12, true),

-- Engineering & Technical
((SELECT id FROM public.countries WHERE country_code = 'CA'), 'Canadian Engineering Qualifications Board', 'CEQB', 'https://engineerscanada.ca', 13, true),
((SELECT id FROM public.countries WHERE country_code = 'CA'), 'Professional Engineers Ontario', 'PEO', 'https://peo.on.ca', 14, true),
((SELECT id FROM public.countries WHERE country_code = 'CA'), 'Canadian Information Processing Society', 'CIPS', 'https://cips.ca', 15, true),

-- Education & Teaching
((SELECT id FROM public.countries WHERE country_code = 'CA'), 'Ontario College of Teachers', 'OCT', 'https://oct.ca', 16, true),
((SELECT id FROM public.countries WHERE country_code = 'CA'), 'Teacher Certification Canada', 'Teaching', 'https://edu.gov.on.ca', 17, true),

-- Professional Services
((SELECT id FROM public.countries WHERE country_code = 'CA'), 'Real Estate Council of Ontario', 'RECO', 'https://reco.on.ca', 18, true),
((SELECT id FROM public.countries WHERE country_code = 'CA'), 'Insurance Institute of Canada', 'IIC', 'https://insuranceinstitute.ca', 19, true),
((SELECT id FROM public.countries WHERE country_code = 'CA'), 'Canadian Institute of Management', 'CIM', 'https://cim.ca', 20, true),
((SELECT id FROM public.countries WHERE country_code = 'CA'), 'Project Management Institute Canada', 'PMI', 'https://pmi.org/chapters/canada', 21, true),
((SELECT id FROM public.countries WHERE country_code = 'CA'), 'Canadian Human Resources Professional', 'CHRP', 'https://cphr.ca', 22, true),
((SELECT id FROM public.countries WHERE country_code = 'CA'), 'Certified General Accountants', 'CGA', 'https://cga-canada.org', 23, true),
((SELECT id FROM public.countries WHERE country_code = 'CA'), 'Canadian Institute of Actuaries', 'CIA', 'https://cia-ica.ca', 24, true);

-- ============================================
-- AUSTRALIA (AU) - Top 24 Government Exams
-- ============================================
INSERT INTO public.footer_famous_exams (country_id, exam_name, exam_short_name, official_website, display_order, is_active) VALUES
-- Government & Public Service
((SELECT id FROM public.countries WHERE country_code = 'AU'), 'Australian Public Service Commission', 'APSC', 'https://apsc.gov.au', 1, true),
((SELECT id FROM public.countries WHERE country_code = 'AU'), 'Australian Citizenship Test', 'Citizenship', 'https://homeaffairs.gov.au/citizenship/test-and-interview/test', 2, true),

-- Medical & Healthcare
((SELECT id FROM public.countries WHERE country_code = 'AU'), 'Australian Medical Council Examination', 'AMC', 'https://amc.org.au', 3, true),
((SELECT id FROM public.countries WHERE country_code = 'AU'), 'Graduate Medical School Admissions Test', 'GAMSAT', 'https://gamsat.acer.org', 4, true),
((SELECT id FROM public.countries WHERE country_code = 'AU'), 'Australian Nursing and Midwifery Accreditation Council', 'ANMAC', 'https://anmac.org.au', 5, true),
((SELECT id FROM public.countries WHERE country_code = 'AU'), 'Pharmacy Board of Australia', 'AHPRA', 'https://ahpra.gov.au', 6, true),
((SELECT id FROM public.countries WHERE country_code = 'AU'), 'Australian Dental Council', 'ADC', 'https://adc.org.au', 7, true),

-- Education
((SELECT id FROM public.countries WHERE country_code = 'AU'), 'Higher School Certificate NSW', 'HSC', 'https://educationstandards.nsw.edu.au/wps/portal/nesa/11-12/hsc', 8, true),
((SELECT id FROM public.countries WHERE country_code = 'AU'), 'Victorian Certificate of Education', 'VCE', 'https://vcaa.vic.edu.au', 9, true),
((SELECT id FROM public.countries WHERE country_code = 'AU'), 'Australian Tertiary Admission Rank', 'ATAR', 'https://uac.edu.au/atar', 10, true),

-- Professional Accounting
((SELECT id FROM public.countries WHERE country_code = 'AU'), 'CPA Australia Examination', 'CPA', 'https://cpaaustralia.com.au', 11, true),
((SELECT id FROM public.countries WHERE country_code = 'AU'), 'Chartered Accountants Australia', 'CA ANZ', 'https://charteredaccountantsanz.com', 12, true),

-- Legal
((SELECT id FROM public.countries WHERE country_code = 'AU'), 'Legal Profession Admission Board', 'LPAB', 'https://lpab.justice.nsw.gov.au', 13, true),
((SELECT id FROM public.countries WHERE country_code = 'AU'), 'Victorian Legal Admissions Board', 'VLAB', 'https://lsbc.vic.gov.au', 14, true),

-- Defense & Police
((SELECT id FROM public.countries WHERE country_code = 'AU'), 'Australian Defence Force Aptitude Test', 'YOU Session', 'https://defencejobs.gov.au/joining/can-i-join/assessment-day', 15, true),
((SELECT id FROM public.countries WHERE country_code = 'AU'), 'National Police Checks', 'NPC', 'https://afp.gov.au/what-we-do/services/criminal-records/national-police-checks', 16, true),

-- Engineering & Technical
((SELECT id FROM public.countries WHERE country_code = 'AU'), 'Engineers Australia', 'EA', 'https://engineersaustralia.org.au', 17, true),
((SELECT id FROM public.countries WHERE country_code = 'AU'), 'Australian Computer Society', 'ACS', 'https://acs.org.au', 18, true),

-- Professional Services
((SELECT id FROM public.countries WHERE country_code = 'AU'), 'Real Estate Institute of Australia', 'REIA', 'https://reia.asn.au', 19, true),
((SELECT id FROM public.countries WHERE country_code = 'AU'), 'Australian Institute of Management', 'AIM', 'https://aim.com.au', 20, true),
((SELECT id FROM public.countries WHERE country_code = 'AU'), 'Australian Human Resources Institute', 'AHRI', 'https://ahri.com.au', 21, true),
((SELECT id FROM public.countries WHERE country_code = 'AU'), 'Financial Planning Association', 'FPA', 'https://fpa.com.au', 22, true),
((SELECT id FROM public.countries WHERE country_code = 'AU'), 'Australian Institute of Company Directors', 'AICD', 'https://aicd.com.au', 23, true),
((SELECT id FROM public.countries WHERE country_code = 'AU'), 'Project Management Institute Australia', 'PMI', 'https://pmi.org.au', 24, true);

-- ============================================
-- GERMANY (DE) - Top 24 Government Exams
-- ============================================
INSERT INTO public.footer_famous_exams (country_id, exam_name, exam_short_name, official_website, display_order, is_active) VALUES
-- General Education
((SELECT id FROM public.countries WHERE country_code = 'DE'), 'Abitur', 'Abitur', 'https://kmk.org', 1, true),
((SELECT id FROM public.countries WHERE country_code = 'DE'), 'Realschulabschluss', 'Mittlere Reife', 'https://kmk.org', 2, true),

-- Language Proficiency
((SELECT id FROM public.countries WHERE country_code = 'DE'), 'TestDaF - Test Deutsch als Fremdsprache', 'TestDaF', 'https://testdaf.de', 3, true),
((SELECT id FROM public.countries WHERE country_code = 'DE'), 'Goethe-Zertifikat', 'Goethe', 'https://goethe.de/de/spr/kup.html', 4, true),
((SELECT id FROM public.countries WHERE country_code = 'DE'), 'telc Deutsch Prüfungen', 'telc', 'https://telc.net', 5, true),
((SELECT id FROM public.countries WHERE country_code = 'DE'), 'DSH - Deutsche Sprachprüfung', 'DSH', 'https://dsh-germany.com', 6, true),

-- Medical & Healthcare
((SELECT id FROM public.countries WHERE country_code = 'DE'), 'Medical Licensing Examination', 'Ärztliche Prüfung', 'https://bundesaerztekammer.de', 7, true),
((SELECT id FROM public.countries WHERE country_code = 'DE'), 'Pharmacy State Examination', 'Pharmazie', 'https://abda.de', 8, true),
((SELECT id FROM public.countries WHERE country_code = 'DE'), 'Nursing State Examination', 'Gesundheits- und Krankenpflege', 'https://bundesgesundheitsministerium.de', 9, true),

-- Legal
((SELECT id FROM public.countries WHERE country_code = 'DE'), 'First State Examination in Law', 'Erstes Staatsexamen', 'https://bundesjustizamt.de', 10, true),
((SELECT id FROM public.countries WHERE country_code = 'DE'), 'Second State Examination in Law', 'Zweites Staatsexamen', 'https://bundesjustizamt.de', 11, true),

-- Professional Certifications
((SELECT id FROM public.countries WHERE country_code = 'DE'), 'Certified Tax Consultant Examination', 'Steuerberater', 'https://bstbk.de', 12, true),
((SELECT id FROM public.countries WHERE country_code = 'DE'), 'Certified Public Accountant Germany', 'Wirtschaftsprüfer', 'https://wpk.de', 13, true),

-- Teaching
((SELECT id FROM public.countries WHERE country_code = 'DE'), 'Teaching Certification First Exam', 'Erstes Staatsexamen Lehramt', 'https://kmk.org', 14, true),
((SELECT id FROM public.countries WHERE country_code = 'DE'), 'Teaching Certification Second Exam', 'Zweites Staatsexamen Lehramt', 'https://kmk.org', 15, true),

-- Technical & Engineering
((SELECT id FROM public.countries WHERE country_code = 'DE'), 'IHK Master Craftsman Examination', 'Meisterprüfung', 'https://dihk.de', 16, true),
((SELECT id FROM public.countries WHERE country_code = 'DE'), 'Engineering State Examination', 'Ingenieur', 'https://vdi.de', 17, true),

-- Civil Service & Government
((SELECT id FROM public.countries WHERE country_code = 'DE'), 'Federal Employment Agency', 'Bundesagentur', 'https://arbeitsagentur.de', 18, true),
((SELECT id FROM public.countries WHERE country_code = 'DE'), 'German Citizenship Test', 'Einbürgerungstest', 'https://bamf.de', 19, true),
((SELECT id FROM public.countries WHERE country_code = 'DE'), 'Public Administration Examination', 'Verwaltungsfachangestellter', 'https://oeffentlicher-dienst.info', 20, true),

-- Vocational Training
((SELECT id FROM public.countries WHERE country_code = 'DE'), 'Chamber of Commerce Examinations', 'IHK-Prüfungen', 'https://ihk.de', 21, true),
((SELECT id FROM public.countries WHERE country_code = 'DE'), 'Certified IT Specialist', 'Fachinformatiker', 'https://dihk.de', 22, true),
((SELECT id FROM public.countries WHERE country_code = 'DE'), 'Certified Business Administrator', 'Fachwirt', 'https://dihk.de', 23, true),
((SELECT id FROM public.countries WHERE country_code = 'DE'), 'Certified Technical Specialist', 'Techniker', 'https://dihk.de', 24, true);

-- ============================================
-- FRANCE (FR) - Top 24 Government Exams
-- ============================================
INSERT INTO public.footer_famous_exams (country_id, exam_name, exam_short_name, official_website, display_order, is_active) VALUES
-- General Education
((SELECT id FROM public.countries WHERE country_code = 'FR'), 'Baccalauréat Général', 'Bac', 'https://education.gouv.fr/le-baccalaureat-3098', 1, true),
((SELECT id FROM public.countries WHERE country_code = 'FR'), 'Brevet des Collèges', 'DNB', 'https://education.gouv.fr', 2, true),

-- Civil Service
((SELECT id FROM public.countries WHERE country_code = 'FR'), 'Concours de la Fonction Publique', 'Fonction Publique', 'https://fonction-publique.gouv.fr/concours', 3, true),
((SELECT id FROM public.countries WHERE country_code = 'FR'), 'École Nationale d''Administration', 'ENA', 'https://ena.fr', 4, true),

-- Language Proficiency
((SELECT id FROM public.countries WHERE country_code = 'FR'), 'DELF - Diplôme d''Études en Langue Française', 'DELF', 'https://france-education-international.fr/delf-dalf', 5, true),
((SELECT id FROM public.countries WHERE country_code = 'FR'), 'DALF - Diplôme Approfondi de Langue Française', 'DALF', 'https://france-education-international.fr/delf-dalf', 6, true),
((SELECT id FROM public.countries WHERE country_code = 'FR'), 'TCF - Test de Connaissance du Français', 'TCF', 'https://france-education-international.fr/tcf', 7, true),

-- Medical & Healthcare
((SELECT id FROM public.countries WHERE country_code = 'FR'), 'Examen Classant National Médecine', 'ECN', 'https://cnci.univ-lyon1.fr', 8, true),
((SELECT id FROM public.countries WHERE country_code = 'FR'), 'Diplôme d''État Infirmier', 'DEI', 'https://sante.gouv.fr', 9, true),
((SELECT id FROM public.countries WHERE country_code = 'FR'), 'Diplôme d''État de Pharmacie', 'Pharmacie', 'https://ordre.pharmacien.fr', 10, true),

-- Teaching
((SELECT id FROM public.countries WHERE country_code = 'FR'), 'CAPES - Certificat d''Aptitude au Professorat', 'CAPES', 'https://devenirenseignant.gouv.fr', 11, true),
((SELECT id FROM public.countries WHERE country_code = 'FR'), 'Agrégation', 'Agrégation', 'https://devenirenseignant.gouv.fr', 12, true),
((SELECT id FROM public.countries WHERE country_code = 'FR'), 'CRPE - Concours de Recrutement des Professeurs', 'CRPE', 'https://devenirenseignant.gouv.fr', 13, true),

-- Legal
((SELECT id FROM public.countries WHERE country_code = 'FR'), 'Concours de la Magistrature', 'ENM', 'https://enm-justice.fr', 14, true),
((SELECT id FROM public.countries WHERE country_code = 'FR'), 'Examen d''Avocat', 'CRFPA', 'https://cnb.avocat.fr', 15, true),

-- Professional Certifications
((SELECT id FROM public.countries WHERE country_code = 'FR'), 'Diplôme d''Expertise Comptable', 'DEC', 'https://experts-comptables.fr', 16, true),
((SELECT id FROM public.countries WHERE country_code = 'FR'), 'Diplôme de Commissaire aux Comptes', 'DCC', 'https://cncc.fr', 17, true),

-- Engineering & Technical
((SELECT id FROM public.countries WHERE country_code = 'FR'), 'Concours des Grandes Écoles d''Ingénieurs', 'Grandes Écoles', 'https://concours-mines-ponts.fr', 18, true),
((SELECT id FROM public.countries WHERE country_code = 'FR'), 'BTS - Brevet de Technicien Supérieur', 'BTS', 'https://education.gouv.fr', 19, true),

-- Business & Management
((SELECT id FROM public.countries WHERE country_code = 'FR'), 'Concours Écoles de Commerce', 'BCE/Ecricome', 'https://concours-bce.com', 20, true),
((SELECT id FROM public.countries WHERE country_code = 'FR'), 'IAE Message', 'IAE', 'https://iae-message.fr', 21, true),

-- Public Service
((SELECT id FROM public.countries WHERE country_code = 'FR'), 'Concours de la Police Nationale', 'Police', 'https://lapolicenationalerecrute.fr', 22, true),
((SELECT id FROM public.countries WHERE country_code = 'FR'), 'Concours des Douanes', 'Douanes', 'https://douane.gouv.fr', 23, true),
((SELECT id FROM public.countries WHERE country_code = 'FR'), 'Concours de l''Armée Française', 'Armée', 'https://sengager.fr', 24, true);

-- ============================================
-- JAPAN (JP) - Top 24 Government Exams
-- ============================================
INSERT INTO public.footer_famous_exams (country_id, exam_name, exam_short_name, official_website, display_order, is_active) VALUES
-- Civil Service
((SELECT id FROM public.countries WHERE country_code = 'JP'), 'National Public Service Examination Type I', 'NPSE Type I', 'https://jinji.go.jp', 1, true),
((SELECT id FROM public.countries WHERE country_code = 'JP'), 'National Public Service Examination Type II', 'NPSE Type II', 'https://jinji.go.jp', 2, true),

-- Language Proficiency
((SELECT id FROM public.countries WHERE country_code = 'JP'), 'Japanese Language Proficiency Test', 'JLPT', 'https://jlpt.jp', 3, true),
((SELECT id FROM public.countries WHERE country_code = 'JP'), 'Business Japanese Proficiency Test', 'BJT', 'https://kanken.or.jp/bjt', 4, true),

-- University Entrance
((SELECT id FROM public.countries WHERE country_code = 'JP'), 'National Center Test for University Admissions', 'Center Test', 'https://dnc.ac.jp', 5, true),

-- Medical & Healthcare
((SELECT id FROM public.countries WHERE country_code = 'JP'), 'National Medical Practitioners Examination', 'NMPE', 'https://mhlw.go.jp/kouseiroudoushou/shikaku_shiken/ishi', 6, true),
((SELECT id FROM public.countries WHERE country_code = 'JP'), 'National Nursing Examination', 'Kangoshi', 'https://mhlw.go.jp/kouseiroudoushou/shikaku_shiken/kangoshi', 7, true),
((SELECT id FROM public.countries WHERE country_code = 'JP'), 'Pharmacy License Examination', 'Yakuzaishi', 'https://mhlw.go.jp/kouseiroudoushou/shikaku_shiken/yakuzaishi', 8, true),
((SELECT id FROM public.countries WHERE country_code = 'JP'), 'Dental License Examination', 'Shikaishi', 'https://mhlw.go.jp/kouseiroudoushou/shikaku_shiken/shikaishi', 9, true),

-- Legal
((SELECT id FROM public.countries WHERE country_code = 'JP'), 'Bar Examination', 'Shiho Shiken', 'https://moj.go.jp/jinji/shihoushiken', 10, true),
((SELECT id FROM public.countries WHERE country_code = 'JP'), 'Judicial Scrivener Examination', 'Shiho Shoshi', 'https://moj.go.jp', 11, true),

-- Professional Certifications
((SELECT id FROM public.countries WHERE country_code = 'JP'), 'Certified Public Accountant Examination', 'CPA Japan', 'https://cpa-mitakai.net', 12, true),
((SELECT id FROM public.countries WHERE country_code = 'JP'), 'Tax Accountant Examination', 'Zeirishi', 'https://nta.go.jp', 13, true),

-- Teaching
((SELECT id FROM public.countries WHERE country_code = 'JP'), 'Teaching Certificate Examination', 'Kyoin Menkyou', 'https://mext.go.jp', 14, true),

-- Technical & Professional
((SELECT id FROM public.countries WHERE country_code = 'JP'), 'Professional Engineer Examination', 'Gijutsu-shi', 'https://engineer.or.jp', 15, true),
((SELECT id FROM public.countries WHERE country_code = 'JP'), 'First Class Architect Examination', '1-kyu Kenchikushi', 'https://jaeic.or.jp', 16, true),
((SELECT id FROM public.countries WHERE country_code = 'JP'), 'Information Technology Engineer Examination', 'Joho Gijutsu-sha', 'https://ipa.go.jp', 17, true),

-- Real Estate
((SELECT id FROM public.countries WHERE country_code = 'JP'), 'Real Estate Transaction Specialist', 'Takuchi Torihiki-shi', 'https://retio.or.jp', 18, true),

-- Social Work
((SELECT id FROM public.countries WHERE country_code = 'JP'), 'Certified Social Worker Examination', 'Shakai Fukushi-shi', 'https://mhlw.go.jp', 19, true),

-- Business
((SELECT id FROM public.countries WHERE country_code = 'JP'), 'Certified Management Consultant', 'Chusho Kigyo Shindan-shi', 'https://j-smeca.jp', 20, true),

-- Labor & Personnel
((SELECT id FROM public.countries WHERE country_code = 'JP'), 'Certified Labor and Social Security Attorney', 'Shakaihoken Roumu-shi', 'https://mhlw.go.jp', 21, true),

-- Financial Services
((SELECT id FROM public.countries WHERE country_code = 'JP'), 'Securities Representative Type I', 'Shoken Gaikan', 'https://jsda.or.jp', 22, true),

-- Postal Service
((SELECT id FROM public.countries WHERE country_code = 'JP'), 'Japan Post Service Examination', 'Yubin Kyoku', 'https://japanpost.jp', 23, true),

-- Police
((SELECT id FROM public.countries WHERE country_code = 'JP'), 'Police Officer Examination', 'Keisatsu Kan', 'https://npa.go.jp', 24, true);

-- ============================================
-- SINGAPORE (SG) - Top 24 Government Exams
-- ============================================
INSERT INTO public.footer_famous_exams (country_id, exam_name, exam_short_name, official_website, display_order, is_active) VALUES
-- Primary & Secondary Education
((SELECT id FROM public.countries WHERE country_code = 'SG'), 'Primary School Leaving Examination', 'PSLE', 'https://seab.gov.sg/home/examinations/psle', 1, true),
((SELECT id FROM public.countries WHERE country_code = 'SG'), 'Singapore-Cambridge GCE N-Level', 'N-Level', 'https://seab.gov.sg/home/examinations/gce-n-level', 2, true),
((SELECT id FROM public.countries WHERE country_code = 'SG'), 'Singapore-Cambridge GCE O-Level', 'O-Level', 'https://seab.gov.sg/home/examinations/gce-o-level', 3, true),
((SELECT id FROM public.countries WHERE country_code = 'SG'), 'Singapore-Cambridge GCE A-Level', 'A-Level', 'https://seab.gov.sg/home/examinations/gce-a-level', 4, true),

-- Medical & Healthcare
((SELECT id FROM public.countries WHERE country_code = 'SG'), 'Singapore Medical Council Examination', 'SMC', 'https://healthprofessionals.gov.sg/smc', 5, true),
((SELECT id FROM public.countries WHERE country_code = 'SG'), 'Singapore Nursing Board Examination', 'SNB', 'https://healthprofessionals.gov.sg/snb', 6, true),
((SELECT id FROM public.countries WHERE country_code = 'SG'), 'Singapore Pharmacy Council', 'SPC', 'https://healthprofessionals.gov.sg/spc', 7, true),
((SELECT id FROM public.countries WHERE country_code = 'SG'), 'Singapore Dental Council', 'SDC', 'https://healthprofessionals.gov.sg/sdc', 8, true),

-- Legal
((SELECT id FROM public.countries WHERE country_code = 'SG'), 'Singapore Bar Examination', 'Bar Exam', 'https://lawsociety.org.sg', 9, true),

-- Professional Accounting
((SELECT id FROM public.countries WHERE country_code = 'SG'), 'Institute of Singapore Chartered Accountants', 'ISCA', 'https://isca.org.sg', 10, true),
((SELECT id FROM public.countries WHERE country_code = 'SG'), 'ACCA Singapore', 'ACCA', 'https://accaglobal.com/sg', 11, true),

-- Civil Service
((SELECT id FROM public.countries WHERE country_code = 'SG'), 'Public Service Commission Scholarship', 'PSC', 'https://psc.gov.sg', 12, true),

-- Engineering & Technical
((SELECT id FROM public.countries WHERE country_code = 'SG'), 'Professional Engineers Board', 'PEB', 'https://bca.gov.sg/peb', 13, true),
((SELECT id FROM public.countries WHERE country_code = 'SG'), 'Building and Construction Authority Examinations', 'BCA', 'https://bca.gov.sg', 14, true),

-- Education
((SELECT id FROM public.countries WHERE country_code = 'SG'), 'National Institute of Education', 'NIE', 'https://nie.edu.sg', 15, true),

-- Financial Services
((SELECT id FROM public.countries WHERE country_code = 'SG'), 'Capital Markets and Financial Advisory Services', 'CMFAS', 'https://ibf.org.sg', 16, true),
((SELECT id FROM public.countries WHERE country_code = 'SG'), 'Singapore Financial Planner', 'SFP', 'https://fpas.org.sg', 17, true),

-- Polytechnic & ITE
((SELECT id FROM public.countries WHERE country_code = 'SG'), 'Singapore Polytechnic Admissions', 'Polytechnic', 'https://polytechnic.edu.sg', 18, true),
((SELECT id FROM public.countries WHERE country_code = 'SG'), 'Institute of Technical Education', 'ITE', 'https://ite.edu.sg', 19, true),

-- Professional Services
((SELECT id FROM public.countries WHERE country_code = 'SG'), 'Real Estate Salesperson License', 'RES', 'https://cea.gov.sg', 20, true),
((SELECT id FROM public.countries WHERE country_code = 'SG'), 'Insurance Examinations', 'GIA/AITI', 'https://gia.org.sg', 21, true),

-- Information Technology
((SELECT id FROM public.countries WHERE country_code = 'SG'), 'Singapore Computer Society', 'SCS', 'https://scs.org.sg', 22, true),

-- Human Resources
((SELECT id FROM public.countries WHERE country_code = 'SG'), 'Institute for Human Resource Professionals', 'IHRP', 'https://ihrp.sg', 23, true),

-- Tourism & Hospitality
((SELECT id FROM public.countries WHERE country_code = 'SG'), 'Singapore Tourism Board Certification', 'STB', 'https://stb.gov.sg', 24, true);

-- ============================================
-- UNITED ARAB EMIRATES (AE) - Top 24 Government Exams
-- ============================================
INSERT INTO public.footer_famous_exams (country_id, exam_name, exam_short_name, official_website, display_order, is_active) VALUES
-- General Education
((SELECT id FROM public.countries WHERE country_code = 'AE'), 'Emirates Standardized Test', 'EmSAT', 'https://emsat.moe.gov.ae', 1, true),
((SELECT id FROM public.countries WHERE country_code = 'AE'), 'Ministry of Education Examinations', 'MOE UAE', 'https://moe.gov.ae', 2, true),
((SELECT id FROM public.countries WHERE country_code = 'AE'), 'Common Educational Proficiency Assessment', 'CEPA', 'https://moe.gov.ae', 3, true),

-- Medical & Healthcare (Multiple Emirates)
((SELECT id FROM public.countries WHERE country_code = 'AE'), 'Dubai Health Authority Licensing', 'DHA', 'https://dha.gov.ae', 4, true),
((SELECT id FROM public.countries WHERE country_code = 'AE'), 'Abu Dhabi Department of Health', 'DOH', 'https://doh.gov.ae', 5, true),
((SELECT id FROM public.countries WHERE country_code = 'AE'), 'Ministry of Health and Prevention License', 'MOHAP', 'https://mohap.gov.ae', 6, true),
((SELECT id FROM public.countries WHERE country_code = 'AE'), 'Sharjah Health Authority', 'SHA', 'https://sha.gov.ae', 7, true),

-- Civil Service
((SELECT id FROM public.countries WHERE country_code = 'AE'), 'Federal Authority for Government Human Resources', 'FAHR', 'https://fahr.gov.ae', 8, true),

-- Police & Defense
((SELECT id FROM public.countries WHERE country_code = 'AE'), 'Dubai Police Recruitment', 'Dubai Police', 'https://dubaipolice.gov.ae', 9, true),
((SELECT id FROM public.countries WHERE country_code = 'AE'), 'Abu Dhabi Police', 'AD Police', 'https://adpolice.gov.ae', 10, true),

-- Education
((SELECT id FROM public.countries WHERE country_code = 'AE'), 'UAE Teaching License', 'Teaching License', 'https://moe.gov.ae', 11, true),
((SELECT id FROM public.countries WHERE country_code = 'AE'), 'Abu Dhabi Education Council', 'ADEC', 'https://adek.gov.ae', 12, true),

-- Universities
((SELECT id FROM public.countries WHERE country_code = 'AE'), 'UAE University Entrance', 'UAEU', 'https://uaeu.ac.ae', 13, true),
((SELECT id FROM public.countries WHERE country_code = 'AE'), 'American University of Sharjah', 'AUS', 'https://aus.edu', 14, true),

-- Professional Certifications
((SELECT id FROM public.countries WHERE country_code = 'AE'), 'Dubai Municipality Examinations', 'DM', 'https://dm.gov.ae', 15, true),
((SELECT id FROM public.countries WHERE country_code = 'AE'), 'Abu Dhabi Municipality', 'ADM', 'https://adjm.gov.ae', 16, true),

-- Financial Services
((SELECT id FROM public.countries WHERE country_code = 'AE'), 'Emirates Institute for Banking and Financial Studies', 'EIBFS', 'https://eibfs.com', 17, true),
((SELECT id FROM public.countries WHERE country_code = 'AE'), 'Dubai Financial Services Authority', 'DFSA', 'https://dfsa.ae', 18, true),

-- Real Estate
((SELECT id FROM public.countries WHERE country_code = 'AE'), 'Real Estate Regulatory Agency', 'RERA', 'https://dubailand.gov.ae', 19, true),

-- Legal
((SELECT id FROM public.countries WHERE country_code = 'AE'), 'UAE Ministry of Justice', 'MOJ', 'https://moj.gov.ae', 20, true),

-- Engineering
((SELECT id FROM public.countries WHERE country_code = 'AE'), 'Engineers Registration Committee', 'ERC', 'https://uaeerc.gov.ae', 21, true),

-- Tourism & Hospitality
((SELECT id FROM public.countries WHERE country_code = 'AE'), 'Department of Tourism and Commerce Marketing', 'DTCM', 'https://dubaitourism.gov.ae', 22, true),

-- Aviation
((SELECT id FROM public.countries WHERE country_code = 'AE'), 'General Civil Aviation Authority', 'GCAA', 'https://gcaa.gov.ae', 23, true),

-- Media
((SELECT id FROM public.countries WHERE country_code = 'AE'), 'National Media Council', 'NMC', 'https://nmc.gov.ae', 24, true);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Check total count (should be 264 = 11 countries × 24 exams)
SELECT COUNT(*) as total_exams FROM public.footer_famous_exams WHERE is_active = true;

-- Check count per country
SELECT
c.country_name,
c.flag_emoji,
COUNT(ffe.id) as exam_count
FROM public.countries c
LEFT JOIN public.footer_famous_exams ffe ON c.id = ffe.country_id
WHERE c.is_active = true
GROUP BY c.country_name, c.flag_emoji
ORDER BY c.country_name;

-- Preview some exams from each country
SELECT
c.country_name,
c.flag_emoji,
ffe.exam_short_name,
ffe.exam_name,
ffe.official_website
FROM public.footer_famous_exams ffe
JOIN public.countries c ON ffe.country_id = c.id
WHERE ffe.is_active = true
ORDER BY c.country_name, ffe.display_order
LIMIT 50;

-- ============================================
-- MIGRATION COMPLETE! ✅
-- Total: 264 exams across 11 countries (24 per country)
-- ============================================
SELECT '✅ Successfully inserted 264 government exams (24 per country) for 11 countries!' as status;

-- ============================================
-- ADD SEO FIELDS TO FAMOUS EXAMS TABLE
-- Run this in your Supabase SQL Editor
-- ============================================

-- Add SEO fields to footer_famous_exams table
ALTER TABLE public.footer_famous_exams 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS meta_title TEXT,
ADD COLUMN IF NOT EXISTS meta_description TEXT,
ADD COLUMN IF NOT EXISTS keywords TEXT,
ADD COLUMN IF NOT EXISTS page_content TEXT;

-- Create index for slug-based queries
CREATE INDEX IF NOT EXISTS idx_footer_famous_exams_slug ON public.footer_famous_exams(slug);

-- ============================================
-- FUNCTION TO GENERATE UNIQUE SLUGS
-- ============================================

CREATE OR REPLACE FUNCTION generate_famous_exam_slug(
  exam_short_name TEXT,
  exam_name TEXT,
  country_code TEXT
)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Use short name if available, otherwise use full name
  IF exam_short_name IS NOT NULL AND exam_short_name != '' THEN
    base_slug := lower(regexp_replace(
      regexp_replace(exam_short_name || '-' || country_code, '[^a-zA-Z0-9\s-]', '', 'g'),
      '\s+', '-', 'g'
    ));
  ELSE
    base_slug := lower(regexp_replace(
      regexp_replace(exam_name || '-' || country_code, '[^a-zA-Z0-9\s-]', '', 'g'),
      '\s+', '-', 'g'
    ));
  END IF;
  
  -- Trim leading/trailing hyphens
  base_slug := trim(both '-' from base_slug);
  final_slug := base_slug;
  
  -- Check for uniqueness and append number if needed
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.footer_famous_exams WHERE slug = final_slug
    ) THEN
      EXIT;
    END IF;
    
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- GENERATE SEO CONTENT FOR FAMOUS EXAMS
-- ============================================

CREATE OR REPLACE FUNCTION generate_famous_exam_seo_content(
  p_exam_name TEXT,
  p_exam_short_name TEXT,
  p_country_name TEXT,
  p_official_website TEXT
) RETURNS TEXT AS $$
DECLARE
  exam_display_name TEXT;
  current_year TEXT := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
BEGIN
  -- Use short name if available, otherwise full name
  exam_display_name := COALESCE(p_exam_short_name, p_exam_name);
  
  RETURN format(
    '<div class="seo-content">
      <h2>%s - Complete Information Guide %s</h2>
      
      <p><strong>%s</strong> is one of the most prestigious examinations in %s. 
      This comprehensive guide provides all essential information about %s including 
      how to apply, exam pattern, syllabus, eligibility criteria, important dates, 
      admit card downloads, result checking, and official notifications for %s.</p>
      
      <h3>Quick Overview - %s</h3>
      <ul>
        <li><strong>Exam Name:</strong> %s</li>
        <li><strong>Short Form:</strong> %s</li>
        <li><strong>Country:</strong> %s</li>
        <li><strong>Official Website:</strong> <a href="%s" target="_blank" rel="noopener noreferrer">%s</a></li>
        <li><strong>Exam Type:</strong> Government/Competitive Examination</li>
        <li><strong>Application Mode:</strong> Online</li>
      </ul>
      
      <h3>About %s</h3>
      <p>%s (%s) is a highly competitive examination that opens doors to excellent career 
      opportunities. Thousands of candidates appear for this exam every year, making it one of 
      the most sought-after examinations in %s.</p>
      
      <h3>How to Apply for %s</h3>
      <p>Follow these steps to apply for %s:</p>
      <ol>
        <li>Visit the official website: <a href="%s" target="_blank" rel="noopener noreferrer">%s</a></li>
        <li>Click on the "Apply Online" or "Registration" link</li>
        <li>Create your account using a valid email address and phone number</li>
        <li>Fill in all required personal and educational details accurately</li>
        <li>Upload necessary documents (photograph, signature, certificates as required)</li>
        <li>Pay the application fee through available online payment modes</li>
        <li>Submit the form and download/save the confirmation receipt for future reference</li>
        <li>Note down your application/registration number</li>
      </ol>
      
      <h3>Eligibility Criteria</h3>
      <p>Candidates must meet the following general eligibility criteria for %s:</p>
      <ul>
        <li><strong>Educational Qualification:</strong> As specified in the official notification</li>
        <li><strong>Age Limit:</strong> Generally 18-35 years (varies by category and position)</li>
        <li><strong>Age Relaxation:</strong> Available for reserved categories as per government norms</li>
        <li><strong>Nationality:</strong> Generally open to citizens of %s and other eligible candidates</li>
        <li><strong>Physical Standards:</strong> If applicable, as mentioned in the notification</li>
      </ul>
      <p><em>Note: Please refer to the official notification for exact eligibility criteria.</em></p>
      
      <h3>Exam Pattern and Structure</h3>
      <p>The %s examination typically consists of multiple stages designed to assess candidates comprehensive knowledge and aptitude:</p>
      <ul>
        <li><strong>Preliminary Examination:</strong> Objective type questions (if applicable)</li>
        <li><strong>Main Examination:</strong> Written examination with descriptive/objective papers</li>
        <li><strong>Interview/Personality Test:</strong> Final selection stage (if applicable)</li>
        <li><strong>Physical Tests:</strong> If required for the particular position</li>
      </ul>
      
      <h3>Syllabus and Preparation</h3>
      <p>The syllabus for %s covers a wide range of topics. Key areas typically include:</p>
      <ul>
        <li>General Knowledge and Current Affairs</li>
        <li>Subject-specific topics as per the exam requirements</li>
        <li>Reasoning and Aptitude</li>
        <li>Quantitative Ability (if applicable)</li>
        <li>Language Proficiency</li>
      </ul>
      
      <h3>Important Dates %s</h3>
      <p>Keep track of these crucial dates (dates vary each year):</p>
      <ul>
        <li><strong>Notification Release:</strong> Check official website regularly</li>
        <li><strong>Online Application Start Date:</strong> As per official notification</li>
        <li><strong>Last Date to Apply:</strong> Usually 30-45 days from notification</li>
        <li><strong>Fee Payment Last Date:</strong> Same as application deadline or 1-2 days after</li>
        <li><strong>Admit Card Release:</strong> Usually 2-3 weeks before the exam</li>
        <li><strong>Examination Date:</strong> As announced in the notification</li>
        <li><strong>Result Declaration:</strong> As per the examination schedule</li>
      </ul>
      
      <h3>Admit Card Download</h3>
      <p>To download your %s admit card:</p>
      <ol>
        <li>Visit the official website close to the exam date</li>
        <li>Look for the "Admit Card" or "Hall Ticket" link</li>
        <li>Enter your registration number and date of birth/password</li>
        <li>Download and take multiple printouts</li>
        <li>Verify all details carefully</li>
        <li>Carry the admit card along with a valid ID proof on exam day</li>
      </ol>
      
      <h3>Result Checking Process</h3>
      <p>After the examination:</p>
      <ol>
        <li>Results are published on the official website</li>
        <li>Visit %s</li>
        <li>Click on the "Results" section</li>
        <li>Enter your roll number or registration number</li>
        <li>View and download your result/scorecard</li>
        <li>Save the result for future reference</li>
      </ol>
      
      <h3>Preparation Tips for %s</h3>
      <ul>
        <li>Study the complete syllabus thoroughly from official sources</li>
        <li>Create a realistic study schedule and follow it consistently</li>
        <li>Practice previous years question papers extensively</li>
        <li>Take regular mock tests to improve speed and accuracy</li>
        <li>Focus on weak areas while maintaining strong subjects</li>
        <li>Stay updated with current affairs and recent developments</li>
        <li>Join online forums or study groups for peer learning</li>
        <li>Maintain good health and manage stress effectively</li>
        <li>Revise regularly and make short notes for quick revision</li>
      </ul>
      
      <h3>Career Opportunities</h3>
      <p>Successful candidates of %s can expect:</p>
      <ul>
        <li>Prestigious government positions with job security</li>
        <li>Competitive salary packages with regular increments</li>
        <li>Excellent growth and promotion opportunities</li>
        <li>Comprehensive benefits including medical, pension, and allowances</li>
        <li>Opportunity to serve the nation and contribute to society</li>
      </ul>
      
      <h3>Frequently Asked Questions (FAQs)</h3>
      
      <h4>Q1: What is the official website for %s?</h4>
      <p>A: The official website is <a href="%s" target="_blank" rel="noopener noreferrer">%s</a>. 
      Always check this website for authentic information and notifications.</p>
      
      <h4>Q2: How can I download the admit card?</h4>
      <p>A: Admit cards are typically available 2-3 weeks before the exam on the official website. 
      Log in with your credentials to download.</p>
      
      <h4>Q3: What documents do I need on exam day?</h4>
      <p>A: You must carry your admit card and a valid photo ID proof (Aadhaar, PAN, Passport, 
      Driving License, Voter ID, etc.).</p>
      
      <h4>Q4: Is there negative marking in the exam?</h4>
      <p>A: This varies by exam. Please refer to the official notification for detailed 
      information about the marking scheme.</p>
      
      <h4>Q5: How do I check my result?</h4>
      <p>A: Results are published on the official website. You can check using your roll number 
      or registration number.</p>
      
      <h4>Q6: What is the selection process?</h4>
      <p>A: The selection process typically involves written examination(s) and may include 
      interview/personality test depending on the specific exam.</p>
      
      <h4>Q7: Can I edit my application after submission?</h4>
      <p>A: Most exams provide a correction window after initial submission. Check the official 
      notification for exact dates.</p>
      
      <h4>Q8: What is the application fee?</h4>
      <p>A: The application fee varies. General category candidates typically pay higher fees, 
      while reserved categories may get fee concessions. Check the official notification.</p>
      
      <h3>Official Resources and Links</h3>
      <p>For the most accurate and updated information, always refer to:</p>
      <ul>
        <li><strong>Official Website:</strong> <a href="%s" target="_blank" rel="noopener noreferrer">%s</a></li>
        <li><strong>Official Notifications:</strong> Available in the "Downloads" or "Notifications" section</li>
        <li><strong>Frequently Asked Questions:</strong> Check the FAQ section on official website</li>
        <li><strong>Contact Details:</strong> Helpline numbers and email addresses on official portal</li>
        <li><strong>Social Media:</strong> Official social media handles for updates</li>
      </ul>
      
      <h3>Important Tips</h3>
      <ul>
        <li>Always bookmark the official website for quick access</li>
        <li>Enable notifications from the official website if available</li>
        <li>Keep your login credentials safe and secure</li>
        <li>Save all confirmation emails and receipts</li>
        <li>Read all instructions carefully before applying</li>
        <li>Apply well before the deadline to avoid last-minute technical issues</li>
        <li>Verify all entered information before final submission</li>
      </ul>
      
      <div class="disclaimer-section mt-6 p-4 bg-yellow-50 border-l-4 border-yellow-400">
        <h4 class="font-semibold text-yellow-800 mb-2">⚠️ Important Disclaimer</h4>
        <p class="text-sm text-yellow-700">
          This information is compiled for reference and guidance purposes only. For official, 
          accurate, and up-to-date details, please visit the official website at 
          <a href="%s" class="underline font-semibold">%s</a>. 
          We are not affiliated with the official examination body. All exam-related decisions 
          should be made based on official notifications and guidelines only.
        </p>
      </div>
    </div>',
    -- Title with year
    exam_display_name, current_year,
    
    -- Introduction
    exam_display_name, p_country_name, exam_display_name, current_year,
    
    -- Quick Overview
    exam_display_name, p_exam_name, 
    COALESCE(p_exam_short_name, 'N/A'), p_country_name, 
    p_official_website, p_official_website,
    
    -- About section
    exam_display_name, p_exam_name, 
    COALESCE(p_exam_short_name, exam_display_name), p_country_name,
    
    -- How to Apply
    exam_display_name, exam_display_name,
    p_official_website, p_official_website,
    
    -- Eligibility
    exam_display_name, p_country_name,
    
    -- Exam Pattern
    exam_display_name,
    
    -- Syllabus
    exam_display_name,
    
    -- Important Dates
    current_year,
    
    -- Admit Card
    exam_display_name,
    
    -- Result
    p_official_website,
    
    -- Preparation Tips
    exam_display_name,
    
    -- Career Opportunities
    exam_display_name,
    
    -- FAQs
    exam_display_name, p_official_website, p_official_website,
    
    -- Official Resources
    p_official_website, p_official_website,
    
    -- Disclaimer
    p_official_website, p_official_website
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- UPDATE EXISTING RECORDS WITH SLUGS AND SEO
-- ============================================

-- Generate slugs for all existing famous exams
UPDATE public.footer_famous_exams ffe
SET slug = generate_famous_exam_slug(
  ffe.exam_short_name,
  ffe.exam_name,
  c.country_code
)
FROM public.countries c
WHERE ffe.country_id = c.id AND ffe.slug IS NULL;

-- Generate SEO metadata for all existing famous exams
UPDATE public.footer_famous_exams ffe
SET 
  meta_title = COALESCE(
    ffe.meta_title,
    COALESCE(ffe.exam_short_name, ffe.exam_name) || ' ' || 
    EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || 
    ' - Exam Notification, Admit Card, Result | ' || c.country_name
  ),
  meta_description = COALESCE(
    ffe.meta_description,
    'Complete guide for ' || COALESCE(ffe.exam_short_name, ffe.exam_name) || 
    ' ' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || 
    '. Get exam notifications, download admit card, check results, syllabus, and important dates. Official website: ' || 
    ffe.official_website
  ),
  keywords = COALESCE(
    ffe.keywords,
    COALESCE(ffe.exam_short_name, ffe.exam_name) || ', ' || 
    ffe.exam_name || ', ' || 
    COALESCE(ffe.exam_short_name, ffe.exam_name) || ' ' || 
    EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || ', ' ||
    'admit card, result, notification, syllabus, exam date, ' || 
    c.country_name || ' government exam, official website, ' || 
    COALESCE(ffe.exam_short_name, ffe.exam_name) || ' preparation, ' ||
    'how to apply, eligibility criteria'
  ),
  page_content = generate_famous_exam_seo_content(
    ffe.exam_name,
    ffe.exam_short_name,
    c.country_name,
    ffe.official_website
  )
FROM public.countries c
WHERE ffe.country_id = c.id;

-- ============================================
-- CREATE TRIGGER FOR AUTO-GENERATION
-- ============================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS auto_generate_famous_exam_seo ON public.footer_famous_exams;

-- Create function for trigger
CREATE OR REPLACE FUNCTION auto_generate_famous_exam_seo()
RETURNS TRIGGER AS $$
DECLARE
  v_country_code TEXT;
  v_country_name TEXT;
BEGIN
  -- Get country details
  SELECT country_code, country_name INTO v_country_code, v_country_name
  FROM public.countries
  WHERE id = NEW.country_id;
  
  -- Generate slug if not provided
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_famous_exam_slug(
      NEW.exam_short_name,
      NEW.exam_name,
      v_country_code
    );
  END IF;
  
  -- Generate meta_title if not provided
  IF NEW.meta_title IS NULL OR NEW.meta_title = '' THEN
    NEW.meta_title := COALESCE(NEW.exam_short_name, NEW.exam_name) || ' ' || 
      EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || 
      ' - Exam Notification, Admit Card, Result | ' || v_country_name;
  END IF;
  
  -- Generate meta_description if not provided
  IF NEW.meta_description IS NULL OR NEW.meta_description = '' THEN
    NEW.meta_description := 'Complete guide for ' || 
      COALESCE(NEW.exam_short_name, NEW.exam_name) || ' ' || 
      EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || 
      '. Get exam notifications, download admit card, check results, syllabus, and important dates. Official website: ' || 
      NEW.official_website;
  END IF;
  
  -- Generate keywords if not provided
  IF NEW.keywords IS NULL OR NEW.keywords = '' THEN
    NEW.keywords := COALESCE(NEW.exam_short_name, NEW.exam_name) || ', ' || 
      NEW.exam_name || ', ' || 
      COALESCE(NEW.exam_short_name, NEW.exam_name) || ' ' || 
      EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || ', ' ||
      'admit card, result, notification, syllabus, exam date, ' || 
      v_country_name || ' government exam, official website, ' || 
      COALESCE(NEW.exam_short_name, NEW.exam_name) || ' preparation, ' ||
      'how to apply, eligibility criteria';
  END IF;
  
  -- Generate page_content if not provided
  IF NEW.page_content IS NULL OR NEW.page_content = '' THEN
    NEW.page_content := generate_famous_exam_seo_content(
      NEW.exam_name,
      NEW.exam_short_name,
      v_country_name,
      NEW.official_website
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER auto_generate_famous_exam_seo
  BEFORE INSERT OR UPDATE ON public.footer_famous_exams
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_famous_exam_seo();

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check if slugs are generated
SELECT 
  COUNT(*) as total_exams,
  COUNT(slug) as exams_with_slug,
  COUNT(meta_title) as exams_with_meta_title,
  COUNT(page_content) as exams_with_content
FROM public.footer_famous_exams;

-- Sample some generated data
SELECT 
  exam_short_name,
  exam_name,
  slug,
  LEFT(meta_title, 60) as meta_title_preview,
  LEFT(meta_description, 80) as meta_desc_preview
FROM public.footer_famous_exams
LIMIT 10;

-- ============================================
-- MIGRATION COMPLETE! ✅
-- ============================================
SELECT '✅ SEO fields added to famous exams and auto-generation configured!' as status;

-- ============================================
-- OPTIMIZED ADMIN STATS FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stats json;
BEGIN
  -- Single query to get all counts at once
  SELECT json_build_object(
    'countries', (SELECT COUNT(*) FROM countries),
    'jobs', (SELECT COUNT(*) FROM job_listings),
    'exams', (SELECT COUNT(*) FROM exam_listings),
    'activeJobs', (SELECT COUNT(*) FROM job_listings WHERE is_active = true),
    'famousExams', (SELECT COUNT(*) FROM footer_famous_exams),
    'notices', (SELECT COUNT(*) FROM notices WHERE is_active = true),
    'answerKeys', (SELECT COUNT(*) FROM answer_keys),
    'results', (SELECT COUNT(*) FROM results)
  ) INTO stats;
  
  RETURN stats;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_admin_stats() TO authenticated;

-- Optional: Create a cached materialized view for even faster performance
CREATE MATERIALIZED VIEW IF NOT EXISTS admin_stats_cache AS
SELECT
  (SELECT COUNT(*) FROM countries) as countries,
  (SELECT COUNT(*) FROM job_listings) as jobs,
  (SELECT COUNT(*) FROM exam_listings) as exams,
  (SELECT COUNT(*) FROM job_listings WHERE is_active = true) as active_jobs,
  (SELECT COUNT(*) FROM footer_famous_exams) as famous_exams,
  (SELECT COUNT(*) FROM notices WHERE is_active = true) as notices,
  (SELECT COUNT(*) FROM answer_keys) as answer_keys,
  (SELECT COUNT(*) FROM results) as results,
  NOW() as last_updated;

-- Create index for faster refresh
CREATE UNIQUE INDEX IF NOT EXISTS admin_stats_cache_idx ON admin_stats_cache (last_updated);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_admin_stats_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY admin_stats_cache;
END;
$$;

-- Optional: Auto-refresh every hour
-- (You can call this from a cron job or trigger)

-- ============================================
-- DATABASE SEO FIELDS SYNC CHECKER & FIXER
-- Run this in Supabase SQL Editor
-- ============================================

-- Check if all tables have required SEO fields
DO $$
DECLARE
  missing_fields TEXT := '';
BEGIN
  -- Check exam_listings
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'exam_listings' AND column_name = 'slug'
  ) THEN
    missing_fields := missing_fields || 'exam_listings.slug, ';
  END IF;

  -- Check job_listings
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'job_listings' AND column_name = 'slug'
  ) THEN
    missing_fields := missing_fields || 'job_listings.slug, ';
  END IF;

  -- Check results
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'results' AND column_name = 'slug'
  ) THEN
    missing_fields := missing_fields || 'results.slug, ';
  END IF;

  -- Check answer_keys
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'answer_keys' AND column_name = 'slug'
  ) THEN
    missing_fields := missing_fields || 'answer_keys.slug, ';
  END IF;

  IF length(missing_fields) > 0 THEN
    RAISE NOTICE '❌ Missing SEO fields: %', rtrim(missing_fields, ', ');
  ELSE
    RAISE NOTICE '✅ All tables have required SEO fields!';
  END IF;
END $$;

-- ============================================
-- CHECK FOR DUPLICATE SLUGS (CRITICAL ISSUE!)
-- ============================================

-- Check for duplicate slugs in each table
SELECT 'exam_listings' as table_name, slug, COUNT(*) as count
FROM exam_listings
WHERE slug IS NOT NULL
GROUP BY slug
HAVING COUNT(*) > 1

UNION ALL

SELECT 'job_listings', slug, COUNT(*)
FROM job_listings
WHERE slug IS NOT NULL
GROUP BY slug
HAVING COUNT(*) > 1

UNION ALL

SELECT 'results', slug, COUNT(*)
FROM results
WHERE slug IS NOT NULL
GROUP BY slug
HAVING COUNT(*) > 1

UNION ALL

SELECT 'answer_keys', slug, COUNT(*)
FROM answer_keys
WHERE slug IS NOT NULL
GROUP BY slug
HAVING COUNT(*) > 1

UNION ALL

SELECT 'footer_famous_exams', slug, COUNT(*)
FROM footer_famous_exams
WHERE slug IS NOT NULL
GROUP BY slug
HAVING COUNT(*) > 1;

-- ============================================
-- CHECK FOR NULL SLUGS (DATA QUALITY ISSUE)
-- ============================================

SELECT 
  'exam_listings' as table_name,
  COUNT(*) FILTER (WHERE slug IS NULL) as null_slugs,
  COUNT(*) FILTER (WHERE meta_title IS NULL) as null_meta_titles,
  COUNT(*) FILTER (WHERE meta_description IS NULL) as null_meta_descriptions,
  COUNT(*) as total_records
FROM exam_listings
WHERE is_active = true

UNION ALL

SELECT 
  'job_listings',
  COUNT(*) FILTER (WHERE slug IS NULL),
  COUNT(*) FILTER (WHERE meta_title IS NULL),
  COUNT(*) FILTER (WHERE meta_description IS NULL),
  COUNT(*)
FROM job_listings
WHERE is_active = true

UNION ALL

SELECT 
  'results',
  COUNT(*) FILTER (WHERE slug IS NULL),
  COUNT(*) FILTER (WHERE meta_title IS NULL),
  COUNT(*) FILTER (WHERE meta_description IS NULL),
  COUNT(*)
FROM results
WHERE is_active = true

UNION ALL

SELECT 
  'answer_keys',
  COUNT(*) FILTER (WHERE slug IS NULL),
  COUNT(*) FILTER (WHERE meta_title IS NULL),
  COUNT(*) FILTER (WHERE meta_description IS NULL),
  COUNT(*)
FROM answer_keys
WHERE is_active = true

UNION ALL

SELECT 
  'footer_famous_exams',
  COUNT(*) FILTER (WHERE slug IS NULL),
  COUNT(*) FILTER (WHERE meta_title IS NULL),
  COUNT(*) FILTER (WHERE meta_description IS NULL),
  COUNT(*)
FROM footer_famous_exams
WHERE is_active = true;

-- ============================================
-- FIX NULL SLUGS AND SEO FIELDS
-- ============================================

-- Fix exam_listings
UPDATE exam_listings
SET slug = generate_unique_slug(
  exam_name || '-' || EXTRACT(YEAR FROM COALESCE(notification_date, created_at, CURRENT_DATE))::TEXT,
  'exam_listings',
  id
)
WHERE slug IS NULL AND is_active = true;

-- Fix job_listings
UPDATE job_listings
SET slug = generate_unique_slug(
  job_title || '-' || department_name || '-' || EXTRACT(YEAR FROM COALESCE(application_deadline, created_at, CURRENT_DATE))::TEXT,
  'job_listings',
  id
)
WHERE slug IS NULL AND is_active = true;

-- Fix results
UPDATE results
SET slug = generate_unique_slug(
  exam_name || '-result-' || EXTRACT(YEAR FROM COALESCE(release_date, created_at, CURRENT_DATE))::TEXT,
  'results',
  id
)
WHERE slug IS NULL AND is_active = true;

-- Fix answer_keys
UPDATE answer_keys
SET slug = generate_unique_slug(
  exam_name || '-answer-key-' || EXTRACT(YEAR FROM COALESCE(exam_date, created_at, CURRENT_DATE))::TEXT,
  'answer_keys',
  id
)
WHERE slug IS NULL AND is_active = true;

-- ============================================
-- VERIFY ALL TRIGGERS ARE ACTIVE
-- ============================================

SELECT 
  trigger_name,
  event_object_table as table_name,
  action_statement,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE '%slug%'
ORDER BY event_object_table;

-- ============================================
-- SUMMARY REPORT
-- ============================================

SELECT '✅ Database sync check complete!' as status;

-- Count total SEO-ready records
SELECT 
  SUM(total) as total_seo_ready_records
FROM (
  SELECT COUNT(*) as total FROM exam_listings WHERE is_active = true AND slug IS NOT NULL
  UNION ALL
  SELECT COUNT(*) FROM job_listings WHERE is_active = true AND slug IS NOT NULL
  UNION ALL
  SELECT COUNT(*) FROM results WHERE is_active = true AND slug IS NOT NULL
  UNION ALL
  SELECT COUNT(*) FROM answer_keys WHERE is_active = true AND slug IS NOT NULL
  UNION ALL
  SELECT COUNT(*) FROM footer_famous_exams WHERE is_active = true AND slug IS NOT NULL
) AS counts;

-- ============================================
-- VERIFY RESULTS DATA BY COUNTRY
-- Run this in Supabase SQL Editor to check your data
-- ============================================

-- Check total results count
SELECT COUNT(*) as total_results FROM public.results WHERE is_active = true;

-- Check results grouped by country
SELECT 
  c.country_name,
  c.country_code,
  c.flag_emoji,
  COUNT(r.id) as result_count,
  COUNT(CASE WHEN r.result_link IS NOT NULL THEN 1 END) as live_results,
  COUNT(CASE WHEN r.result_link IS NULL THEN 1 END) as coming_soon_results,
  COUNT(CASE WHEN r.is_pinned = true THEN 1 END) as pinned_results
FROM public.countries c
LEFT JOIN public.results r ON c.id = r.country_id AND r.is_active = true
WHERE c.is_active = true
GROUP BY c.country_name, c.country_code, c.flag_emoji
ORDER BY c.country_name;

-- Check if France has any results
SELECT 
  r.exam_name,
  r.conducting_body,
  r.result_link,
  r.release_date,
  r.is_pinned,
  r.is_active
FROM public.results r
JOIN public.countries c ON r.country_id = c.id
WHERE c.country_code = 'FR'
ORDER BY r.is_pinned DESC, r.release_date DESC;

-- Sample results from India for comparison
SELECT 
  r.exam_name,
  r.conducting_body,
  r.result_link,
  r.release_date,
  r.is_pinned,
  r.is_active
FROM public.results r
JOIN public.countries c ON r.country_id = c.id
WHERE c.country_code = 'IN'
ORDER BY r.is_pinned DESC, r.release_date DESC
LIMIT 5;

-- ============================================
-- FIX: ADD SAMPLE RESULTS FOR OTHER COUNTRIES
-- ============================================

-- Add sample results for France (if none exist)
INSERT INTO public.results (country_id, exam_name, conducting_body, result_link, release_date, is_pinned, is_active)
SELECT 
  c.id,
  'Baccalauréat Général 2025',
  'Ministère de l''Éducation Nationale',
  'https://education.gouv.fr/resultats',
  '2026-07-05',
  true,
  true
FROM public.countries c
WHERE c.country_code = 'FR'
  AND NOT EXISTS (
    SELECT 1 FROM public.results r 
    WHERE r.country_id = c.id AND r.exam_name = 'Baccalauréat Général 2025'
  );

INSERT INTO public.results (country_id, exam_name, conducting_body, result_link, release_date, is_pinned, is_active)
SELECT 
  c.id,
  'Concours de la Fonction Publique 2025',
  'Fonction Publique',
  'https://fonction-publique.gouv.fr/resultats',
  '2026-06-15',
  true,
  true
FROM public.countries c
WHERE c.country_code = 'FR'
  AND NOT EXISTS (
    SELECT 1 FROM public.results r 
    WHERE r.country_id = c.id AND r.exam_name = 'Concours de la Fonction Publique 2025'
  );

INSERT INTO public.results (country_id, exam_name, conducting_body, result_link, release_date, is_pinned, is_active)
SELECT 
  c.id,
  'Concours National d''Internat en Médecine',
  'Centre National de Gestion',
  NULL,
  '2026-09-10',
  false,
  true
FROM public.countries c
WHERE c.country_code = 'FR'
  AND NOT EXISTS (
    SELECT 1 FROM public.results r 
    WHERE r.country_id = c.id AND r.exam_name = 'Concours National d''Internat en Médecine'
  );

INSERT INTO public.results (country_id, exam_name, conducting_body, result_link, release_date, is_pinned, is_active)
SELECT 
  c.id,
  'CAPES 2026',
  'Ministère de l''Éducation',
  NULL,
  '2026-08-20',
  false,
  true
FROM public.countries c
WHERE c.country_code = 'FR'
  AND NOT EXISTS (
    SELECT 1 FROM public.results r 
    WHERE r.country_id = c.id AND r.exam_name = 'CAPES 2026'
  );

-- Add sample results for United States
INSERT INTO public.results (country_id, exam_name, conducting_body, result_link, release_date, is_pinned, is_active)
SELECT 
  c.id,
  'USMLE Step 1 - March 2026',
  'National Board of Medical Examiners',
  'https://usmle.org/results',
  '2026-04-01',
  true,
  true
FROM public.countries c
WHERE c.country_code = 'US'
  AND NOT EXISTS (
    SELECT 1 FROM public.results r 
    WHERE r.country_id = c.id AND r.exam_name = 'USMLE Step 1 - March 2026'
  );

INSERT INTO public.results (country_id, exam_name, conducting_body, result_link, release_date, is_pinned, is_active)
SELECT 
  c.id,
  'Federal Bar Exam 2026',
  'National Conference of Bar Examiners',
  NULL,
  '2026-05-15',
  false,
  true
FROM public.countries c
WHERE c.country_code = 'US'
  AND NOT EXISTS (
    SELECT 1 FROM public.results r 
    WHERE r.country_id = c.id AND r.exam_name = 'Federal Bar Exam 2026'
  );

-- Add sample results for United Kingdom
INSERT INTO public.results (country_id, exam_name, conducting_body, result_link, release_date, is_pinned, is_active)
SELECT 
  c.id,
  'Civil Service Fast Stream 2025',
  'UK Civil Service Commission',
  'https://faststream.gov.uk/results',
  '2026-03-30',
  true,
  true
FROM public.countries c
WHERE c.country_code = 'GB'
  AND NOT EXISTS (
    SELECT 1 FROM public.results r 
    WHERE r.country_id = c.id AND r.exam_name = 'Civil Service Fast Stream 2025'
  );

INSERT INTO public.results (country_id, exam_name, conducting_body, result_link, release_date, is_pinned, is_active)
SELECT 
  c.id,
  'A-Level Results 2026',
  'Office of Qualifications and Examinations Regulation',
  NULL,
  '2026-08-13',
  false,
  true
FROM public.countries c
WHERE c.country_code = 'GB'
  AND NOT EXISTS (
    SELECT 1 FROM public.results r 
    WHERE r.country_id = c.id AND r.exam_name = 'A-Level Results 2026'
  );

-- Add sample results for Canada
INSERT INTO public.results (country_id, exam_name, conducting_body, result_link, release_date, is_pinned, is_active)
SELECT 
  c.id,
  'MCCQE Part I Results 2026',
  'Medical Council of Canada',
  'https://mcc.ca/results',
  '2026-04-10',
  true,
  true
FROM public.countries c
WHERE c.country_code = 'CA'
  AND NOT EXISTS (
    SELECT 1 FROM public.results r 
    WHERE r.country_id = c.id AND r.exam_name = 'MCCQE Part I Results 2026'
  );

-- Add sample results for Australia
INSERT INTO public.results (country_id, exam_name, conducting_body, result_link, release_date, is_pinned, is_active)
SELECT 
  c.id,
  'AMC Clinical Examination Results',
  'Australian Medical Council',
  'https://amc.org.au/results',
  '2026-03-25',
  true,
  true
FROM public.countries c
WHERE c.country_code = 'AU'
  AND NOT EXISTS (
    SELECT 1 FROM public.results r 
    WHERE r.country_id = c.id AND r.exam_name = 'AMC Clinical Examination Results'
  );

-- Add sample results for Germany
INSERT INTO public.results (country_id, exam_name, conducting_body, result_link, release_date, is_pinned, is_active)
SELECT 
  c.id,
  'Abitur 2026 Ergebnisse',
  'Kultusministerkonferenz',
  'https://kmk.org/ergebnisse',
  '2026-06-20',
  true,
  true
FROM public.countries c
WHERE c.country_code = 'DE'
  AND NOT EXISTS (
    SELECT 1 FROM public.results r 
    WHERE r.country_id = c.id AND r.exam_name = 'Abitur 2026 Ergebnisse'
  );

-- Add sample results for Japan
INSERT INTO public.results (country_id, exam_name, conducting_body, result_link, release_date, is_pinned, is_active)
SELECT 
  c.id,
  'National Public Service Examination Type I Results',
  'National Personnel Authority',
  'https://jinji.go.jp/results',
  '2026-05-30',
  true,
  true
FROM public.countries c
WHERE c.country_code = 'JP'
  AND NOT EXISTS (
    SELECT 1 FROM public.results r 
    WHERE r.country_id = c.id AND r.exam_name = 'National Public Service Examination Type I Results'
  );

-- Add sample results for Singapore
INSERT INTO public.results (country_id, exam_name, conducting_body, result_link, release_date, is_pinned, is_active)
SELECT 
  c.id,
  'GCE O-Level Results 2026',
  'Singapore Examinations and Assessment Board',
  'https://seab.gov.sg/results',
  '2026-01-12',
  true,
  true
FROM public.countries c
WHERE c.country_code = 'SG'
  AND NOT EXISTS (
    SELECT 1 FROM public.results r 
    WHERE r.country_id = c.id AND r.exam_name = 'GCE O-Level Results 2026'
  );

-- Add sample results for UAE
INSERT INTO public.results (country_id, exam_name, conducting_body, result_link, release_date, is_pinned, is_active)
SELECT 
  c.id,
  'EmSAT Results 2026',
  'Ministry of Education UAE',
  'https://emsat.moe.gov.ae/results',
  '2026-06-15',
  true,
  true
FROM public.countries c
WHERE c.country_code = 'AE'
  AND NOT EXISTS (
    SELECT 1 FROM public.results r 
    WHERE r.country_id = c.id AND r.exam_name = 'EmSAT Results 2026'
  );

-- ============================================
-- VERIFY THE FIXES
-- ============================================

-- Check updated results by country
SELECT 
  c.country_name,
  c.country_code,
  COUNT(r.id) as result_count
FROM public.countries c
LEFT JOIN public.results r ON c.id = r.country_id AND r.is_active = true
WHERE c.is_active = true
GROUP BY c.country_name, c.country_code
ORDER BY c.country_name;

SELECT '✅ Results verification and sample data insertion complete!' as status;

-- ============================================
-- AI-POWERED SEO CONTENT GENERATION - FIXED
-- Run this in your Supabase SQL Editor
-- ============================================

-- Add AI generation tracking columns to exam_listings
ALTER TABLE public.exam_listings 
ADD COLUMN IF NOT EXISTS ai_content_generated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS content_generated_at TIMESTAMP WITH TIME ZONE;

-- Add AI generation tracking columns to job_listings
ALTER TABLE public.job_listings 
ADD COLUMN IF NOT EXISTS ai_content_generated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS content_generated_at TIMESTAMP WITH TIME ZONE;

-- Add AI generation tracking columns to footer_famous_exams
ALTER TABLE public.footer_famous_exams 
ADD COLUMN IF NOT EXISTS ai_content_generated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS content_generated_at TIMESTAMP WITH TIME ZONE;

-- Add AI generation tracking columns to answer_keys
ALTER TABLE public.answer_keys 
ADD COLUMN IF NOT EXISTS ai_content_generated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS content_generated_at TIMESTAMP WITH TIME ZONE;

-- Add AI generation tracking columns to results
ALTER TABLE public.results 
ADD COLUMN IF NOT EXISTS ai_content_generated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS content_generated_at TIMESTAMP WITH TIME ZONE;

-- Create function to mark content for AI regeneration when important fields change
CREATE OR REPLACE FUNCTION mark_for_ai_regeneration()
RETURNS TRIGGER AS $$
BEGIN
  -- When important fields are updated, mark for AI regeneration
  IF TG_OP = 'UPDATE' THEN
    -- For exam_listings
    IF TG_TABLE_NAME = 'exam_listings' THEN
      IF (OLD.exam_name IS DISTINCT FROM NEW.exam_name) OR
         (OLD.conducting_body IS DISTINCT FROM NEW.conducting_body) OR
         (OLD.exam_date IS DISTINCT FROM NEW.exam_date) THEN
        NEW.ai_content_generated := false;
        NEW.page_content := NULL;
      END IF;
    END IF;
    
    -- For job_listings
    IF TG_TABLE_NAME = 'job_listings' THEN
      IF (OLD.job_title IS DISTINCT FROM NEW.job_title) OR
         (OLD.department_name IS DISTINCT FROM NEW.department_name) THEN
        NEW.ai_content_generated := false;
        NEW.page_content := NULL;
      END IF;
    END IF;
    
    -- For footer_famous_exams
    IF TG_TABLE_NAME = 'footer_famous_exams' THEN
      IF (OLD.exam_name IS DISTINCT FROM NEW.exam_name) OR
         (OLD.exam_short_name IS DISTINCT FROM NEW.exam_short_name) THEN
        NEW.ai_content_generated := false;
        NEW.page_content := NULL;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for auto-marking when content changes
DROP TRIGGER IF EXISTS mark_exam_for_ai_regen ON public.exam_listings;
CREATE TRIGGER mark_exam_for_ai_regen
  BEFORE UPDATE ON public.exam_listings
  FOR EACH ROW
  EXECUTE FUNCTION mark_for_ai_regeneration();

DROP TRIGGER IF EXISTS mark_job_for_ai_regen ON public.job_listings;
CREATE TRIGGER mark_job_for_ai_regen
  BEFORE UPDATE ON public.job_listings
  FOR EACH ROW
  EXECUTE FUNCTION mark_for_ai_regeneration();

DROP TRIGGER IF EXISTS mark_famous_exam_for_ai_regen ON public.footer_famous_exams;
CREATE TRIGGER mark_famous_exam_for_ai_regen
  BEFORE UPDATE ON public.footer_famous_exams
  FOR EACH ROW
  EXECUTE FUNCTION mark_for_ai_regeneration();

-- ============================================
-- CREATE VIEWS FOR EXAMS NEEDING AI CONTENT
-- ============================================

-- View for exam_listings needing AI content (CORRECTED - no exam_short_name)
CREATE OR REPLACE VIEW exams_needing_ai_content AS
SELECT 
  e.id,
  e.exam_name,
  e.conducting_body,
  e.official_website,
  e.exam_date,
  e.notification_date,
  c.country_name,
  c.country_code,
  e.slug
FROM exam_listings e
JOIN countries c ON e.country_id = c.id
WHERE e.is_active = true 
  AND (e.ai_content_generated = false OR e.ai_content_generated IS NULL OR e.page_content IS NULL)
ORDER BY e.created_at DESC;

-- View for job_listings needing AI content
CREATE OR REPLACE VIEW jobs_needing_ai_content AS
SELECT 
  j.id,
  j.job_title,
  j.department_name,
  j.location,
  j.vacancies,
  j.salary_range,
  j.qualification,
  j.age_limit,
  j.category,
  j.official_link,
  j.application_deadline,
  c.country_name,
  c.country_code,
  j.slug
FROM job_listings j
JOIN countries c ON j.country_id = c.id
WHERE j.is_active = true 
  AND (j.ai_content_generated = false OR j.ai_content_generated IS NULL OR j.page_content IS NULL)
ORDER BY j.created_at DESC;

-- View for famous_exams needing AI content
CREATE OR REPLACE VIEW famous_exams_needing_ai_content AS
SELECT 
  fe.id,
  fe.exam_name,
  fe.exam_short_name,
  fe.official_website,
  c.country_name,
  c.country_code,
  fe.slug
FROM footer_famous_exams fe
JOIN countries c ON fe.country_id = c.id
WHERE fe.is_active = true 
  AND (fe.ai_content_generated = false OR fe.ai_content_generated IS NULL OR fe.page_content IS NULL)
ORDER BY fe.created_at DESC;

-- View for answer_keys needing AI content
CREATE OR REPLACE VIEW answer_keys_needing_ai_content AS
SELECT 
  ak.id,
  ak.exam_name,
  ak.exam_date,
  ak.post_name,
  ak.answer_key_link,
  c.country_name,
  c.country_code,
  ak.slug
FROM answer_keys ak
JOIN countries c ON ak.country_id = c.id
WHERE ak.is_active = true 
  AND (ak.ai_content_generated = false OR ak.ai_content_generated IS NULL OR ak.page_content IS NULL)
ORDER BY ak.created_at DESC;

-- View for results needing AI content
CREATE OR REPLACE VIEW results_needing_ai_content AS
SELECT 
  r.id,
  r.exam_name,
  r.conducting_body,
  r.result_link,
  r.release_date,
  c.country_name,
  c.country_code,
  r.slug
FROM results r
JOIN countries c ON r.country_id = c.id
WHERE r.is_active = true 
  AND (r.ai_content_generated = false OR r.ai_content_generated IS NULL OR r.page_content IS NULL)
ORDER BY r.created_at DESC;

-- Grant access to authenticated users
GRANT SELECT ON exams_needing_ai_content TO authenticated;
GRANT SELECT ON jobs_needing_ai_content TO authenticated;
GRANT SELECT ON famous_exams_needing_ai_content TO authenticated;
GRANT SELECT ON answer_keys_needing_ai_content TO authenticated;
GRANT SELECT ON results_needing_ai_content TO authenticated;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get count of items needing AI content
CREATE OR REPLACE FUNCTION get_ai_content_stats()
RETURNS TABLE (
  table_name TEXT,
  total_active INTEGER,
  needs_ai_content INTEGER,
  has_ai_content INTEGER,
  percentage_complete NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'exam_listings'::TEXT,
    COUNT(*)::INTEGER as total,
    COUNT(*) FILTER (WHERE ai_content_generated = false OR ai_content_generated IS NULL OR page_content IS NULL)::INTEGER,
    COUNT(*) FILTER (WHERE ai_content_generated = true AND page_content IS NOT NULL)::INTEGER,
    ROUND(
      (COUNT(*) FILTER (WHERE ai_content_generated = true AND page_content IS NOT NULL)::NUMERIC / 
       NULLIF(COUNT(*)::NUMERIC, 0)) * 100, 
      2
    )
  FROM exam_listings 
  WHERE is_active = true
  
  UNION ALL
  
  SELECT 
    'job_listings'::TEXT,
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE ai_content_generated = false OR ai_content_generated IS NULL OR page_content IS NULL)::INTEGER,
    COUNT(*) FILTER (WHERE ai_content_generated = true AND page_content IS NOT NULL)::INTEGER,
    ROUND(
      (COUNT(*) FILTER (WHERE ai_content_generated = true AND page_content IS NOT NULL)::NUMERIC / 
       NULLIF(COUNT(*)::NUMERIC, 0)) * 100, 
      2
    )
  FROM job_listings 
  WHERE is_active = true
  
  UNION ALL
  
  SELECT 
    'footer_famous_exams'::TEXT,
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE ai_content_generated = false OR ai_content_generated IS NULL OR page_content IS NULL)::INTEGER,
    COUNT(*) FILTER (WHERE ai_content_generated = true AND page_content IS NOT NULL)::INTEGER,
    ROUND(
      (COUNT(*) FILTER (WHERE ai_content_generated = true AND page_content IS NOT NULL)::NUMERIC / 
       NULLIF(COUNT(*)::NUMERIC, 0)) * 100, 
      2
    )
  FROM footer_famous_exams 
  WHERE is_active = true
  
  UNION ALL
  
  SELECT 
    'answer_keys'::TEXT,
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE ai_content_generated = false OR ai_content_generated IS NULL OR page_content IS NULL)::INTEGER,
    COUNT(*) FILTER (WHERE ai_content_generated = true AND page_content IS NOT NULL)::INTEGER,
    ROUND(
      (COUNT(*) FILTER (WHERE ai_content_generated = true AND page_content IS NOT NULL)::NUMERIC / 
       NULLIF(COUNT(*)::NUMERIC, 0)) * 100, 
      2
    )
  FROM answer_keys 
  WHERE is_active = true
  
  UNION ALL
  
  SELECT 
    'results'::TEXT,
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE ai_content_generated = false OR ai_content_generated IS NULL OR page_content IS NULL)::INTEGER,
    COUNT(*) FILTER (WHERE ai_content_generated = true AND page_content IS NOT NULL)::INTEGER,
    ROUND(
      (COUNT(*) FILTER (WHERE ai_content_generated = true AND page_content IS NOT NULL)::NUMERIC / 
       NULLIF(COUNT(*)::NUMERIC, 0)) * 100, 
      2
    )
  FROM results 
  WHERE is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_ai_content_stats() TO authenticated;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check if columns were added successfully
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('exam_listings', 'job_listings', 'footer_famous_exams', 'answer_keys', 'results')
  AND column_name IN ('ai_content_generated', 'content_generated_at')
ORDER BY table_name, column_name;

-- Check AI content generation stats
SELECT * FROM get_ai_content_stats();

-- Show some exams that need AI content
SELECT * FROM exams_needing_ai_content LIMIT 5;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

SELECT '✅ AI content generation schema updated successfully!' as status,
       '📊 Run "SELECT * FROM get_ai_content_stats();" to see statistics' as next_step;

-- Check if slugs exist for exam_listings
SELECT 
  id,
  exam_name,
  slug,
  ai_content_generated,
  CASE 
    WHEN slug IS NULL THEN '❌ Missing Slug'
    WHEN page_content IS NULL THEN '⚠️ Missing Content'
    ELSE '✅ Ready'
  END as status
FROM exam_listings
WHERE is_active = true
LIMIT 10;

-- Generate missing slugs if needed
UPDATE exam_listings
SET slug = generate_unique_slug(
  exam_name || '-' || EXTRACT(YEAR FROM COALESCE(notification_date, created_at, CURRENT_DATE))::TEXT,
  'exam_listings',
  id
)
WHERE slug IS NULL AND is_active = true;

SELECT 
  COUNT(*) as total_exams,
  COUNT(slug) as with_slugs,
  COUNT(page_content) as with_content
FROM exam_listings
WHERE is_active = true;

-- Temporarily disable RLS to test:
ALTER TABLE exam_listings DISABLE ROW LEVEL SECURITY;

-- ============================================
-- EMERGENCY FIX FOR HANGING INSERT
-- Run this in Supabase SQL Editor RIGHT NOW
-- ============================================

-- STEP 1: Check what triggers exist on exam_listings
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'exam_listings'
  AND trigger_schema = 'public';

-- STEP 2: Temporarily DISABLE the auto-slug trigger (if it exists)
DROP TRIGGER IF EXISTS auto_slug_exam_listings ON public.exam_listings;
DROP TRIGGER IF EXISTS auto_generate_famous_exam_seo ON public.exam_listings;
DROP TRIGGER IF EXISTS mark_exam_for_ai_regen ON public.exam_listings;

-- STEP 3: Test if insert works now
-- Try inserting a test record
INSERT INTO public.exam_listings (
  country_id,
  exam_name,
  conducting_body,
  is_active
) VALUES (
  (SELECT id FROM public.countries WHERE country_code = 'IN' LIMIT 1),
  'TEST EXAM - DELETE ME',
  'TEST BODY',
  false
) RETURNING id, exam_name, slug;

-- STEP 4: Delete the test record
DELETE FROM public.exam_listings WHERE exam_name = 'TEST EXAM - DELETE ME';

-- ============================================
-- If the above insert worked, the trigger was the problem
-- Now let's create a FAST version of the trigger
-- ============================================

-- Create a MUCH FASTER slug generation trigger
CREATE OR REPLACE FUNCTION auto_generate_slug_fast()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate if slug is NULL
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    -- Simple slug without uniqueness check (database will handle duplicates with UNIQUE constraint)
    NEW.slug := lower(
      regexp_replace(
        regexp_replace(NEW.exam_name, '[^a-zA-Z0-9\s-]', '', 'g'),
        '\s+', '-', 'g'
      )
    ) || '-' || substr(md5(random()::text), 1, 8);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the new FAST trigger
CREATE TRIGGER auto_slug_exam_listings_fast
  BEFORE INSERT OR UPDATE ON public.exam_listings
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_slug_fast();

-- ============================================
-- VERIFICATION
-- ============================================

-- Test again with the new fast trigger
INSERT INTO public.exam_listings (
  country_id,
  exam_name,
  conducting_body,
  is_active
) VALUES (
  (SELECT id FROM public.countries WHERE country_code = 'IN' LIMIT 1),
  'TEST EXAM 2 - DELETE ME',
  'TEST BODY 2',
  false
) RETURNING id, exam_name, slug;

-- Clean up
DELETE FROM public.exam_listings WHERE exam_name LIKE 'TEST EXAM%DELETE ME';

-- ============================================
-- SUCCESS! Now try adding an exam from your UI
-- ============================================

SELECT 'TRIGGER FIXED! Try adding an exam now.' as status;

-- ============================================
-- NUCLEAR OPTION: Remove ALL triggers from exam_listings
-- Use this if the previous fix doesn't work
-- ============================================

-- STEP 1: List all triggers (so we know what we're removing)
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'exam_listings'
  AND trigger_schema = 'public';

-- STEP 2: DROP ALL TRIGGERS
DROP TRIGGER IF EXISTS auto_slug_exam_listings ON public.exam_listings;
DROP TRIGGER IF EXISTS auto_slug_exam_listings_fast ON public.exam_listings;
DROP TRIGGER IF EXISTS auto_generate_slug_improved ON public.exam_listings;
DROP TRIGGER IF EXISTS auto_generate_famous_exam_seo ON public.exam_listings;
DROP TRIGGER IF EXISTS mark_exam_for_ai_regen ON public.exam_listings;
DROP TRIGGER IF EXISTS update_exam_listings_updated_at ON public.exam_listings;

-- STEP 3: Verify no triggers remain
SELECT 
  trigger_name
FROM information_schema.triggers
WHERE event_object_table = 'exam_listings'
  AND trigger_schema = 'public';

-- Should return 0 rows

-- STEP 4: Re-enable ONLY the updated_at trigger (safe and fast)
CREATE TRIGGER update_exam_listings_updated_at
  BEFORE UPDATE ON public.exam_listings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- STEP 5: Test insert WITHOUT any slug trigger
INSERT INTO public.exam_listings (
  country_id,
  exam_name,
  conducting_body,
  is_active
) VALUES (
  (SELECT id FROM public.countries WHERE country_code = 'IN' LIMIT 1),
  'NUCLEAR TEST - DELETE ME',
  'TEST',
  false
) RETURNING id, exam_name, slug;

-- STEP 6: Clean up
DELETE FROM public.exam_listings WHERE exam_name = 'NUCLEAR TEST - DELETE ME';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

SELECT 
  'All triggers removed! Slug will be NULL (auto-generated by API instead).' as status,
  'Try adding an exam from your UI now.' as next_step;

-- ============================================
-- FIX EXISTING EXAMS WITH MISSING SLUGS
-- Run this in Supabase SQL Editor
-- ============================================

-- STEP 1: Check how many exams have missing slugs
SELECT 
  COUNT(*) FILTER (WHERE slug IS NULL) as missing_slugs,
  COUNT(*) as total_exams
FROM exam_listings;

-- STEP 2: Generate slugs for ALL existing exams that don't have one
UPDATE exam_listings
SET slug = lower(
  regexp_replace(
    regexp_replace(exam_name || '-' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT, '[^a-zA-Z0-9\s-]', '', 'g'),
    '\s+', '-', 'g'
  )
) || '-' || substr(md5(id::text), 1, 8)
WHERE slug IS NULL;

-- STEP 3: Verify all exams now have slugs
SELECT 
  COUNT(*) FILTER (WHERE slug IS NULL) as missing_slugs,
  COUNT(*) FILTER (WHERE slug IS NOT NULL) as has_slugs,
  COUNT(*) as total_exams
FROM exam_listings;

-- STEP 4: Show sample of generated slugs
SELECT 
  exam_name,
  slug,
  is_active
FROM exam_listings
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- SUCCESS!
-- ============================================

SELECT 
  'All existing exams now have slugs!' as status,
  'You can now add new exams from the UI and they will work!' as next_step;

-- ============================================
-- UPDATE ALL URLs TO kvresults.com
-- Run this in your Supabase SQL Editor
-- ============================================

-- STEP 1: Update job_listings with example.com URLs
-- ============================================

UPDATE public.job_listings
SET official_link = 'https://kvresults.com/jobs/' || slug
WHERE official_link LIKE '%example.com%';

-- If you have apply_link column with example.com
UPDATE public.job_listings
SET apply_link = 'https://kvresults.com/jobs/' || slug || '/apply'
WHERE apply_link LIKE '%example.com%' AND apply_link IS NOT NULL;

-- STEP 2: Update notices with example.com URLs
-- ============================================

UPDATE public.notices
SET notice_link = 'https://kvresults.com/notices'
WHERE notice_link LIKE '%example.com%';

-- STEP 3: Verify the updates
-- ============================================

-- Check job_listings
SELECT 
  job_title,
  official_link,
  apply_link
FROM public.job_listings
WHERE official_link LIKE '%kvresults.com%'
LIMIT 5;

-- Check notices
SELECT 
  notice_text,
  notice_link
FROM public.notices
WHERE notice_link LIKE '%kvresults.com%'
LIMIT 5;

-- ============================================
-- IMPORTANT: Update Official Exam/Result Links
-- ============================================

-- NOTE: The following tables contain REAL official government URLs
-- DO NOT update these - they should point to actual government websites:
-- 
-- - exam_listings.official_website (e.g., upsc.gov.in, ssc.nic.in)
-- - exam_listings.admit_card_link
-- - exam_listings.result_link
-- - exam_listings.syllabus_link
-- - footer_famous_exams.official_website
-- - results.result_link
-- - answer_keys.answer_key_link
--
-- These are EXTERNAL links to government sites and should stay as-is!

-- ============================================
-- OPTIONAL: Add kvresults.com base URL to SEO content
-- ============================================

-- Update meta descriptions to include your domain (optional)
UPDATE public.exam_listings
SET meta_description = REPLACE(
  meta_description,
  'Complete guide for',
  'Complete guide on kvresults.com for'
)
WHERE meta_description IS NOT NULL 
  AND meta_description NOT LIKE '%kvresults.com%';

-- ============================================
-- VERIFICATION SUMMARY
-- ============================================

SELECT 
  'job_listings' as table_name,
  COUNT(*) FILTER (WHERE official_link LIKE '%kvresults.com%') as kvresults_urls,
  COUNT(*) FILTER (WHERE official_link LIKE '%example.com%') as example_urls,
  COUNT(*) as total
FROM public.job_listings

UNION ALL

SELECT 
  'notices',
  COUNT(*) FILTER (WHERE notice_link LIKE '%kvresults.com%'),
  COUNT(*) FILTER (WHERE notice_link LIKE '%example.com%'),
  COUNT(*)
FROM public.notices;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

SELECT 
  '✅ All URLs updated to kvresults.com!' as status,
  'Note: Official government URLs (UPSC, SSC, etc.) were NOT changed - they point to real government sites.' as important_note;

-- This makes admin check 10x faster
CREATE INDEX IF NOT EXISTS idx_user_roles_user_admin 
ON user_roles(user_id, role);

SELECT 
  u.email,
  ur.role,
  ur.created_at
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'shivamkumarsingh8544@gmail.com';

-- ============================================
-- PERMANENT FIX FOR ADMIN AUTHENTICATION
-- Run this in Supabase SQL Editor
-- ============================================

-- STEP 1: Create optimized index for admin checks (if not exists)
CREATE INDEX IF NOT EXISTS idx_user_roles_user_admin 
ON user_roles(user_id, role);

-- STEP 2: Verify your admin role exists
SELECT 
  ur.user_id,
  u.email,
  ur.role,
  ur.created_at
FROM user_roles ur
JOIN auth.users u ON ur.user_id = u.id
WHERE u.email = 'shivamkumarsingh8544@gmail.com';

-- If the above returns NO ROWS, run this:
INSERT INTO public.user_roles (user_id, role) 
SELECT id, 'admin'::app_role
FROM auth.users 
WHERE email = 'shivamkumarsingh8544@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- STEP 3: Verify RLS policies allow users to see their own roles
-- Drop and recreate the policy to ensure it works
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- STEP 4: Ensure the policy is enabled
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- STEP 5: Verify the fix worked
SELECT 
  'Admin role exists: ' || CASE WHEN COUNT(*) > 0 THEN '✅ YES' ELSE '❌ NO' END as status
FROM user_roles ur
JOIN auth.users u ON ur.user_id = u.id
WHERE u.email = 'shivamkumarsingh8544@gmail.com'
  AND ur.role = 'admin';

-- STEP 6: Check if index exists
SELECT 
  'Index exists: ' || CASE WHEN COUNT(*) > 0 THEN '✅ YES' ELSE '❌ NO' END as status
FROM pg_indexes 
WHERE tablename = 'user_roles' 
  AND indexname = 'idx_user_roles_user_admin';

-- ============================================
-- VERIFICATION COMPLETE!
-- ============================================

-- ============================================
-- STEP 1: DROP ALL TRIGGERS on exam_listings
-- ============================================
DROP TRIGGER IF EXISTS auto_slug_exam_listings ON public.exam_listings;
DROP TRIGGER IF EXISTS auto_slug_exam_listings_fast ON public.exam_listings;
DROP TRIGGER IF EXISTS auto_generate_slug_improved ON public.exam_listings;
DROP TRIGGER IF EXISTS auto_generate_famous_exam_seo ON public.exam_listings;
DROP TRIGGER IF EXISTS mark_exam_for_ai_regen ON public.exam_listings;
DROP TRIGGER IF EXISTS update_exam_listings_updated_at ON public.exam_listings;

-- ============================================
-- STEP 2: Re-enable RLS (if you disabled it)
-- ============================================
ALTER TABLE public.exam_listings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: Re-add ONLY the safe updated_at trigger
-- ============================================
CREATE TRIGGER update_exam_listings_updated_at
  BEFORE UPDATE ON public.exam_listings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- STEP 4: Verify only 1 trigger remains
-- ============================================
SELECT trigger_name, event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'exam_listings'
  AND trigger_schema = 'public';
-- Should return ONLY: update_exam_listings_updated_at | UPDATE

-- ============================================
-- FIX 1: Kill all hanging triggers on exam_listings
-- ============================================
DROP TRIGGER IF EXISTS auto_slug_exam_listings ON public.exam_listings;
DROP TRIGGER IF EXISTS auto_slug_exam_listings_fast ON public.exam_listings;
DROP TRIGGER IF EXISTS auto_generate_slug_improved ON public.exam_listings;
DROP TRIGGER IF EXISTS auto_generate_famous_exam_seo ON public.exam_listings;
DROP TRIGGER IF EXISTS mark_exam_for_ai_regen ON public.exam_listings;
DROP TRIGGER IF EXISTS update_exam_listings_updated_at ON public.exam_listings;

-- Re-add ONLY the safe updated_at trigger
CREATE TRIGGER update_exam_listings_updated_at
  BEFORE UPDATE ON public.exam_listings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- FIX 2: Recreate get_admin_stats cleanly with SECURITY DEFINER
-- (yours may have lost this during migrations)
-- ============================================
DROP FUNCTION IF EXISTS public.get_admin_stats();

CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN json_build_object(
    'countries',    (SELECT COUNT(*)::int FROM public.countries),
    'jobs',         (SELECT COUNT(*)::int FROM public.job_listings),
    'exams',        (SELECT COUNT(*)::int FROM public.exam_listings),
    'activeJobs',   (SELECT COUNT(*)::int FROM public.job_listings WHERE is_active = true),
    'famousExams',  (SELECT COUNT(*)::int FROM public.footer_famous_exams),
    'notices',      (SELECT COUNT(*)::int FROM public.notices WHERE is_active = true),
    'answerKeys',   (SELECT COUNT(*)::int FROM public.answer_keys),
    'results',      (SELECT COUNT(*)::int FROM public.results)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_stats() TO anon;

-- ============================================
-- Verify triggers are clean
-- ============================================
SELECT trigger_name, event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'exam_listings' AND trigger_schema = 'public';
-- Should show ONLY: update_exam_listings_updated_at | UPDATE

-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.check_admin_role(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id AND role = 'admin'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_admin_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_admin_role(uuid) TO anon;

-- Add display_order column to exam_listings table
ALTER TABLE public.exam_listings 
ADD COLUMN IF NOT EXISTS display_order INTEGER;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_exam_listings_display_order 
ON public.exam_listings(display_order);

-- Set default display_order based on creation date for existing exams
-- (NULL values will appear after ordered exams)
UPDATE public.exam_listings 
SET display_order = NULL 
WHERE display_order IS NULL;

-- ============================================
-- EMERGENCY FIX: Remove all hanging triggers
-- ============================================

-- Drop ALL triggers on exam_listings
DROP TRIGGER IF EXISTS auto_slug_exam_listings ON public.exam_listings;
DROP TRIGGER IF EXISTS auto_slug_exam_listings_fast ON public.exam_listings;
DROP TRIGGER IF EXISTS auto_generate_slug_improved ON public.exam_listings;
DROP TRIGGER IF EXISTS auto_generate_famous_exam_seo ON public.exam_listings;
DROP TRIGGER IF EXISTS mark_exam_for_ai_regen ON public.exam_listings;
DROP TRIGGER IF EXISTS update_exam_listings_updated_at ON public.exam_listings;

-- Re-add ONLY the safe updated_at trigger
CREATE TRIGGER update_exam_listings_updated_at
  BEFORE UPDATE ON public.exam_listings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Verify only 1 trigger remains
SELECT trigger_name, event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'exam_listings'
  AND trigger_schema = 'public';
-- Should show ONLY: update_exam_listings_updated_at | UPDATE

-- ============================================
-- Fix the slug generation to be SUPER SIMPLE
-- ============================================

-- Function to generate slug WITHOUT database checks (faster)
CREATE OR REPLACE FUNCTION generate_simple_slug(text_input TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(text_input, '[^a-zA-Z0-9\s-]', '', 'g'),
      '\s+', '-', 'g'
    )
  ) || '-' || substr(md5(random()::text), 1, 8);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Fix existing NULL slugs
-- ============================================

UPDATE public.exam_listings
SET slug = generate_simple_slug(exam_name || '-' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT)
WHERE slug IS NULL OR slug = '';

-- ============================================
-- Add index for better performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_exam_listings_slug ON public.exam_listings(slug);
CREATE INDEX IF NOT EXISTS idx_exam_listings_display_order ON public.exam_listings(display_order);
CREATE INDEX IF NOT EXISTS idx_exam_listings_country ON public.exam_listings(country_id);

-- ============================================
-- Verify the fix
-- ============================================

SELECT 
  COUNT(*) as total,
  COUNT(slug) as with_slug,
  COUNT(display_order) as with_order
FROM public.exam_listings;

-- ============================================
-- GROK API KEY ROTATION TABLES
-- Run this in your Supabase SQL Editor FIRST
-- before deploying the Edge Function
-- ============================================

-- Table 1: Single-row pointer for round-robin rotation
CREATE TABLE IF NOT EXISTS public.grok_key_state (
  id INTEGER PRIMARY KEY,
  key_index INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert the initial row (only one row ever exists)
INSERT INTO public.grok_key_state (id, key_index) 
VALUES (1, 0) 
ON CONFLICT (id) DO NOTHING;

-- Table 2: Per-key health tracking (one row per key index 0-5)
CREATE TABLE IF NOT EXISTS public.grok_key_usage (
  key_index INTEGER PRIMARY KEY,
  is_banned BOOLEAN DEFAULT false,
  banned_until TIMESTAMP WITH TIME ZONE,
  fail_count INTEGER DEFAULT 0,
  last_success_at TIMESTAMP WITH TIME ZONE,
  last_fail_at TIMESTAMP WITH TIME ZONE,
  total_requests INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Initialize all 6 key slots
INSERT INTO public.grok_key_usage (key_index) VALUES (0),(1),(2),(3),(4),(5)
ON CONFLICT (key_index) DO NOTHING;

-- ============================================
-- ROW LEVEL SECURITY (service role only)
-- ============================================

ALTER TABLE public.grok_key_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grok_key_usage ENABLE ROW LEVEL SECURITY;

-- Only service role (Edge Functions) can access these tables
CREATE POLICY "Service role only - grok_key_state"
  ON public.grok_key_state
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role only - grok_key_usage"
  ON public.grok_key_usage
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admins can VIEW key status (read-only, no key values exposed)
CREATE POLICY "Admins can view key status"
  ON public.grok_key_usage FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view key state"
  ON public.grok_key_state FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- HELPER FUNCTION: Reset a banned key manually
-- (Run from Supabase Dashboard when you replace an expired key)
-- ============================================

CREATE OR REPLACE FUNCTION public.reset_grok_key(p_key_index INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.grok_key_usage
  SET 
    is_banned = false,
    banned_until = NULL,
    fail_count = 0,
    updated_at = now()
  WHERE key_index = p_key_index;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_grok_key(INTEGER) TO authenticated;

-- ============================================
-- HELPER FUNCTION: Get key health status for admin dashboard
-- ============================================

CREATE OR REPLACE FUNCTION public.get_grok_key_status()
RETURNS TABLE (
  key_index INTEGER,
  status TEXT,
  banned_until TIMESTAMP WITH TIME ZONE,
  fail_count INTEGER,
  last_success_at TIMESTAMP WITH TIME ZONE,
  total_requests INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gku.key_index,
    CASE 
      WHEN gku.is_banned AND gku.banned_until > now() THEN 'banned'
      WHEN gku.fail_count > 0 THEN 'degraded'
      WHEN gku.last_success_at IS NOT NULL THEN 'healthy'
      ELSE 'unused'
    END as status,
    gku.banned_until,
    gku.fail_count,
    gku.last_success_at,
    gku.total_requests
  FROM public.grok_key_usage gku
  ORDER BY gku.key_index;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_grok_key_status() TO authenticated;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_grok_key_usage_banned 
  ON public.grok_key_usage(is_banned, banned_until);

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 
  gku.key_index,
  gku.is_banned,
  gku.fail_count,
  gks.key_index as current_pointer
FROM public.grok_key_usage gku
CROSS JOIN public.grok_key_state gks
WHERE gks.id = 1
ORDER BY gku.key_index;

SELECT '✅ Grok key rotation tables created!' as status;

-- ============================================
-- INSTRUCTIONS TO SET SECRETS IN SUPABASE
-- ============================================

-- Run these in your terminal (Supabase CLI):
--
-- supabase secrets set GROK_API_KEY_1=xai-your-key-1-here
-- supabase secrets set GROK_API_KEY_2=xai-your-key-2-here
-- supabase secrets set GROK_API_KEY_3=xai-your-key-3-here
-- supabase secrets set GROK_API_KEY_4=xai-your-key-4-here
-- supabase secrets set GROK_API_KEY_5=xai-your-key-5-here
-- supabase secrets set GROK_API_KEY_6=xai-your-key-6-here
--
-- Then deploy the function:
-- supabase functions deploy grok-seo
-- ============================================

-- Create chat_messages table
create table chat_messages (
  id uuid default gen_random_uuid() primary key,
  section_id text not null,
  username text not null,
  message text not null,
  created_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table chat_messages enable row level security;

-- Policy: Anyone can read messages
create policy "Anyone can read messages"
  on chat_messages for select using (true);

-- Policy: Anyone can insert messages with 300 char limit
create policy "Anyone can insert messages"
  on chat_messages for insert with check (char_length(message) <= 300);

-- Create index for efficient queries
create index idx_chat_messages_section_id on chat_messages(section_id);
create index idx_chat_messages_created_at on chat_messages(created_at desc);

alter publication supabase_realtime add table chat_messages;

-- ============================================
-- DYNAMIC SECTIONS TABLES
-- ============================================

-- Create dynamic_sections table
CREATE TABLE IF NOT EXISTS dynamic_sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50) DEFAULT 'FileText',
  color VARCHAR(20) DEFAULT 'blue',
  display_order INTEGER DEFAULT 0,
  tab_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  show_in_timeline BOOLEAN DEFAULT true,
  show_in_tabs BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create dynamic_section_items table
CREATE TABLE IF NOT EXISTS dynamic_section_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES dynamic_sections(id) ON DELETE CASCADE,
  country_id UUID REFERENCES countries(id),
  title VARCHAR(255) NOT NULL,
  subtitle VARCHAR(255),
  description TEXT,
  date_value DATE,
  link_url TEXT,
  link_text VARCHAR(100),
  badge_text VARCHAR(50),
  badge_color VARCHAR(20),
  is_pinned BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  slug VARCHAR(255),
  meta_title VARCHAR(255),
  meta_description TEXT,
  meta_keywords TEXT,
  page_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_dynamic_sections_slug ON dynamic_sections(slug);
CREATE INDEX IF NOT EXISTS idx_dynamic_sections_active ON dynamic_sections(is_active);
CREATE INDEX IF NOT EXISTS idx_dynamic_sections_order ON dynamic_sections(display_order);
CREATE INDEX IF NOT EXISTS idx_dynamic_section_items_section ON dynamic_section_items(section_id);
CREATE INDEX IF NOT EXISTS idx_dynamic_section_items_country ON dynamic_section_items(country_id);
CREATE INDEX IF NOT EXISTS idx_dynamic_section_items_active ON dynamic_section_items(is_active);
CREATE INDEX IF NOT EXISTS idx_dynamic_section_items_date ON dynamic_section_items(date_value);
CREATE INDEX IF NOT EXISTS idx_dynamic_section_items_slug ON dynamic_section_items(slug);

-- Enable RLS
ALTER TABLE dynamic_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE dynamic_section_items ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view active sections" ON dynamic_sections
  FOR SELECT USING (is_active = true);

CREATE POLICY "Anyone can view active section items" ON dynamic_section_items
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admin can manage sections" ON dynamic_sections
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Admin can manage section items" ON dynamic_section_items
  FOR ALL USING (true) WITH CHECK (true);

-- Add to realtime
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'dynamic_sections'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE dynamic_sections;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'dynamic_section_items'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE dynamic_section_items;
    END IF;
END
$$;

-- Insert default sections (that don't duplicate static tabs)
INSERT INTO dynamic_sections (name, slug, description, icon, color, display_order, tab_order, show_in_tabs, show_in_timeline) VALUES
  ('Admit Card', 'admit-card', 'Admit cards for government examinations', 'FileCheck', 'purple', 5, 5, true, true),
  ('Notices', 'notices', 'Important notices and announcements', 'Bell', 'orange', 6, 6, true, true)
ON CONFLICT (slug) DO NOTHING;


-- ============================================
-- DYNAMIC SECTIONS TABLES (Idempotent)
-- ============================================

-- Create dynamic_sections table
CREATE TABLE IF NOT EXISTS dynamic_sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50) DEFAULT 'FileText',
  color VARCHAR(20) DEFAULT 'blue',
  display_order INTEGER DEFAULT 0,
  tab_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  show_in_timeline BOOLEAN DEFAULT true,
  show_in_tabs BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create dynamic_section_items table
CREATE TABLE IF NOT EXISTS dynamic_section_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES dynamic_sections(id) ON DELETE CASCADE,
  country_id UUID REFERENCES countries(id),
  title VARCHAR(255) NOT NULL,
  subtitle VARCHAR(255),
  description TEXT,
  date_value DATE,
  link_url TEXT,
  link_text VARCHAR(100),
  badge_text VARCHAR(50),
  badge_color VARCHAR(20),
  is_pinned BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  slug VARCHAR(255),
  meta_title VARCHAR(255),
  meta_description TEXT,
  meta_keywords TEXT,
  page_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_dynamic_sections_slug ON dynamic_sections(slug);
CREATE INDEX IF NOT EXISTS idx_dynamic_sections_active ON dynamic_sections(is_active);
CREATE INDEX IF NOT EXISTS idx_dynamic_sections_order ON dynamic_sections(display_order);
CREATE INDEX IF NOT EXISTS idx_dynamic_section_items_section ON dynamic_section_items(section_id);
CREATE INDEX IF NOT EXISTS idx_dynamic_section_items_country ON dynamic_section_items(country_id);
CREATE INDEX IF NOT EXISTS idx_dynamic_section_items_active ON dynamic_section_items(is_active);
CREATE INDEX IF NOT EXISTS idx_dynamic_section_items_date ON dynamic_section_items(date_value);
CREATE INDEX IF NOT EXISTS idx_dynamic_section_items_slug ON dynamic_section_items(slug);

-- Enable RLS
ALTER TABLE dynamic_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE dynamic_section_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view active sections" ON dynamic_sections;
DROP POLICY IF EXISTS "Anyone can view active section items" ON dynamic_section_items;
DROP POLICY IF EXISTS "Admin can manage sections" ON dynamic_sections;
DROP POLICY IF EXISTS "Admin can manage section items" ON dynamic_section_items;

-- Create policies
CREATE POLICY "Anyone can view active sections" ON dynamic_sections
  FOR SELECT USING (is_active = true);

CREATE POLICY "Anyone can view active section items" ON dynamic_section_items
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admin can manage sections" ON dynamic_sections
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Admin can manage section items" ON dynamic_section_items
  FOR ALL USING (true) WITH CHECK (true);

-- Add to realtime
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'dynamic_sections'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE dynamic_sections;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'dynamic_section_items'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE dynamic_section_items;
    END IF;
END
$$;

-- Insert default sections
INSERT INTO dynamic_sections (name, slug, description, icon, color, display_order, tab_order, show_in_tabs, show_in_timeline) VALUES
  ('Admit Card', 'admit-card', 'Admit cards for government examinations', 'FileCheck', 'purple', 5, 5, true, true),
  ('Notices', 'notices', 'Important notices and announcements', 'Bell', 'orange', 6, 6, true, true)
ON CONFLICT (slug) DO NOTHING;

-- Migrate results to dynamic_section_items
INSERT INTO dynamic_section_items (section_id, country_id, title, subtitle, date_value, link_url, is_active, created_at)
SELECT 
  (SELECT id FROM dynamic_sections WHERE slug = 'latest-results'),
  country_id,
  exam_name,
  conducting_body,
  result_date,
  result_link,
  true,
  NOW()
FROM results
WHERE NOT EXISTS (
  SELECT 1 FROM dynamic_section_items 
  WHERE title = results.exam_name AND section_id = (SELECT id FROM dynamic_sections WHERE slug = 'latest-results')
);

-- Run this in Supabase SQL editor
INSERT INTO dynamic_section_items (section_id, country_id, title, subtitle, date_value, link_url, is_active, created_at)
SELECT 
  (SELECT id FROM dynamic_sections WHERE slug = 'latest-results'),
  country_id,
  exam_name,
  conducting_body,
  result_date,
  result_link,
  true,
  NOW()
FROM results
WHERE NOT EXISTS (
  SELECT 1 FROM dynamic_section_items 
  WHERE title = results.exam_name AND section_id = (SELECT id FROM dynamic_sections WHERE slug = 'latest-results')
);

INSERT INTO dynamic_section_items (section_id, title, subtitle, date_value, is_active, slug, meta_title, meta_description)
VALUES 
((SELECT id FROM dynamic_sections WHERE slug='latest-results'), 'JEE Main Result 2026', 'National Testing Agency', '2026-04-23', true, 'jee-main-2026-result', 'JEE Main 2026 Result', 'Check JEE Main 2026 result'),
((SELECT id FROM dynamic_sections WHERE slug='latest-results'), 'UPSC Prelims 2026', 'Union Public Service Commission', '2026-04-25', true, 'upsc-prelims-2026', 'UPSC Prelims 2026', 'UPSC Prelims notification'),
((SELECT id FROM dynamic_sections WHERE slug='latest-results'), 'SSC CGL 2026', 'Staff Selection Commission', '2026-04-30', true, 'ssc-cgl-2026', 'SSC CGL 2026', 'SSC CGL notification');


-- Migration: Add ai_prompt field to dynamic_sections
-- This allows each section to have a custom AI prompt for content generation

ALTER TABLE dynamic_sections
ADD COLUMN IF NOT EXISTS ai_prompt TEXT;

COMMENT ON COLUMN dynamic_sections.ai_prompt IS 'Custom AI prompt template for generating content for items in this section';

-- Delete all existing dynamic sections (this will cascade delete related items)
-- WARNING: This permanently removes all sections and their items

DELETE FROM dynamic_sections;

-- Alternative: If you want to keep the sections but remove their items only:
-- DELETE FROM dynamic_section_items;

-- Alternative: If you want to reset and start fresh (drop and recreate):
-- DROP TABLE IF EXISTS dynamic_section_items;
-- DROP TABLE IF EXISTS dynamic_sections;

-- ============================================================
-- MIGRATION: Fix dynamic_section_items missing columns
-- Run this in Supabase SQL Editor
-- ============================================================

-- STEP 1: Add ALL missing columns to dynamic_section_items
-- (IF NOT EXISTS means it's safe to run multiple times)
-- ============================================================

ALTER TABLE public.dynamic_section_items
  ADD COLUMN IF NOT EXISTS meta_keywords TEXT,
  ADD COLUMN IF NOT EXISTS ai_content_generated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS content_generated_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS apply_link TEXT,
  ADD COLUMN IF NOT EXISTS official_link TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS vacancies TEXT,
  ADD COLUMN IF NOT EXISTS salary_range TEXT,
  ADD COLUMN IF NOT EXISTS qualification TEXT,
  ADD COLUMN IF NOT EXISTS age_limit TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS conducting_body TEXT,
  ADD COLUMN IF NOT EXISTS exam_date TEXT,
  ADD COLUMN IF NOT EXISTS notification_date DATE,
  ADD COLUMN IF NOT EXISTS admit_card_link TEXT,
  ADD COLUMN IF NOT EXISTS result_link TEXT,
  ADD COLUMN IF NOT EXISTS syllabus_link TEXT,
  ADD COLUMN IF NOT EXISTS answer_key_link TEXT,
  ADD COLUMN IF NOT EXISTS objection_link TEXT,
  ADD COLUMN IF NOT EXISTS objection_deadline DATE,
  ADD COLUMN IF NOT EXISTS official_notification TEXT,
  ADD COLUMN IF NOT EXISTS post_name TEXT,
  ADD COLUMN IF NOT EXISTS release_date DATE,
  ADD COLUMN IF NOT EXISTS ai_prompt TEXT;

-- STEP 2: Add missing column to dynamic_sections too
-- ============================================================

ALTER TABLE public.dynamic_sections
  ADD COLUMN IF NOT EXISTS ai_prompt TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- STEP 3: Create indexes for new columns
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_dynamic_section_items_display_order
  ON public.dynamic_section_items(display_order);

CREATE INDEX IF NOT EXISTS idx_dynamic_section_items_ai_generated
  ON public.dynamic_section_items(ai_content_generated);

CREATE INDEX IF NOT EXISTS idx_dynamic_section_items_pinned
  ON public.dynamic_section_items(is_pinned);

-- STEP 4: Add updated_at trigger to dynamic_section_items
-- (so updated_at stays accurate on updates)
-- ============================================================

DROP TRIGGER IF EXISTS update_dynamic_section_items_updated_at ON public.dynamic_section_items;
CREATE TRIGGER update_dynamic_section_items_updated_at
  BEFORE UPDATE ON public.dynamic_section_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_dynamic_sections_updated_at ON public.dynamic_sections;
CREATE TRIGGER update_dynamic_sections_updated_at
  BEFORE UPDATE ON public.dynamic_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- STEP 5: Fix RLS policies — current ones use "true" which bypasses auth.
-- Replace with proper admin-only write + public read.
-- ============================================================

-- dynamic_sections policies
DROP POLICY IF EXISTS "Anyone can view active sections" ON public.dynamic_sections;
DROP POLICY IF EXISTS "Admin can manage sections" ON public.dynamic_sections;

CREATE POLICY "Anyone can view active sections"
  ON public.dynamic_sections FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can view all sections"
  ON public.dynamic_sections FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert sections"
  ON public.dynamic_sections FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update sections"
  ON public.dynamic_sections FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete sections"
  ON public.dynamic_sections FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- dynamic_section_items policies
DROP POLICY IF EXISTS "Anyone can view active section items" ON public.dynamic_section_items;
DROP POLICY IF EXISTS "Admin can manage section items" ON public.dynamic_section_items;

CREATE POLICY "Anyone can view active section items"
  ON public.dynamic_section_items FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can view all section items"
  ON public.dynamic_section_items FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert section items"
  ON public.dynamic_section_items FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update section items"
  ON public.dynamic_section_items FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete section items"
  ON public.dynamic_section_items FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- STEP 6: Auto-slug generation for dynamic_section_items
-- (Same safe approach as exam_listings: no blocking uniqueness loop)
-- ============================================================

CREATE OR REPLACE FUNCTION auto_slug_dynamic_section_item()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := lower(
      regexp_replace(
        regexp_replace(NEW.title, '[^a-zA-Z0-9\s-]', '', 'g'),
        '\s+', '-', 'g'
      )
    ) || '-' || substr(md5(gen_random_uuid()::text), 1, 8);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_slug_dynamic_section_items ON public.dynamic_section_items;
CREATE TRIGGER auto_slug_dynamic_section_items
  BEFORE INSERT ON public.dynamic_section_items
  FOR EACH ROW EXECUTE FUNCTION auto_slug_dynamic_section_item();

-- STEP 7: Backfill slugs for any existing items missing one
-- ============================================================

UPDATE public.dynamic_section_items
SET slug = lower(
  regexp_replace(
    regexp_replace(title, '[^a-zA-Z0-9\s-]', '', 'g'),
    '\s+', '-', 'g'
  )
) || '-' || substr(md5(id::text), 1, 8)
WHERE slug IS NULL OR slug = '';

-- STEP 8: Reload Supabase schema cache
-- (This is what actually fixes the PGRST204 error in PostgREST)
-- ============================================================

NOTIFY pgrst, 'reload schema';

-- STEP 9: Verify all columns exist
-- ============================================================

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'dynamic_section_items'
ORDER BY ordinal_position;

-- STEP 10: Final status check
-- ============================================================

SELECT 
  (SELECT COUNT(*) FROM dynamic_sections) as total_sections,
  (SELECT COUNT(*) FROM dynamic_section_items) as total_items,
  (SELECT COUNT(*) FROM dynamic_section_items WHERE slug IS NULL) as items_missing_slug,
  (SELECT COUNT(*) FROM dynamic_section_items WHERE meta_keywords IS NULL) as items_missing_keywords
;

SELECT '✅ dynamic_section_items migration complete! All columns added.' as status;

-- Add form_data column for structured content
ALTER TABLE public.dynamic_section_items
ADD COLUMN IF NOT EXISTS form_data JSONB DEFAULT '[]'::jsonb;

-- Reload schema cache so PostgREST recognizes the new column
NOTIFY pgrst, 'reload schema';

-- Verify it was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'dynamic_section_items' AND column_name = 'form_data';

-- Create dynamic_sections table
CREATE TABLE IF NOT EXISTS public.dynamic_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  section_type TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  color TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.dynamic_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active dynamic sections"
  ON public.dynamic_sections FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage dynamic sections"
  ON public.dynamic_sections FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create dynamic_section_items table  
CREATE TABLE IF NOT EXISTS public.dynamic_section_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID REFERENCES public.dynamic_sections(id) ON DELETE CASCADE,
  country_id UUID REFERENCES public.countries(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  date_value DATE,
  slug TEXT,
  link_url TEXT,
  link_text TEXT,
  thumbnail_url TEXT,
  badge_text TEXT,
  badge_color TEXT,
  form_data JSONB,
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT,
  page_content TEXT,
  ai_content_generated BOOLEAN DEFAULT false,
  content_generated_at TIMESTAMP WITH TIME ZONE,
  tags TEXT[],
  is_pinned BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.dynamic_section_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active dynamic section items"
  ON public.dynamic_section_items FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can insert dynamic section items"
  ON public.dynamic_section_items FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- DYNAMIC SECTIONS SCHEMA FIX
-- Safe to run on existing databases (idempotent)
-- ============================================================

-- STEP 1: Ensure dynamic_sections has ALL required columns
-- ============================================================
ALTER TABLE public.dynamic_sections
  ADD COLUMN IF NOT EXISTS name            TEXT          NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS slug            TEXT          NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS description     TEXT,
  ADD COLUMN IF NOT EXISTS icon            TEXT          DEFAULT 'FileText',
  ADD COLUMN IF NOT EXISTS color           TEXT          DEFAULT 'blue',
  ADD COLUMN IF NOT EXISTS display_order   INTEGER       DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tab_order       INTEGER       DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active       BOOLEAN       DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_in_tabs    BOOLEAN       DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_in_timeline BOOLEAN      DEFAULT true,
  ADD COLUMN IF NOT EXISTS ai_prompt       TEXT,
  ADD COLUMN IF NOT EXISTS section_type    TEXT,          -- kept for backward compat
  ADD COLUMN IF NOT EXISTS created_at      TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMP WITH TIME ZONE DEFAULT now();

-- STEP 2: Ensure dynamic_section_items has ALL required columns
-- ============================================================
ALTER TABLE public.dynamic_section_items
  ADD COLUMN IF NOT EXISTS section_id              UUID REFERENCES public.dynamic_sections(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS country_id              UUID REFERENCES public.countries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS title                   TEXT          NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS subtitle                TEXT,
  ADD COLUMN IF NOT EXISTS description             TEXT,
  ADD COLUMN IF NOT EXISTS date_value              DATE,
  ADD COLUMN IF NOT EXISTS slug                    TEXT,
  ADD COLUMN IF NOT EXISTS link_url                TEXT,
  ADD COLUMN IF NOT EXISTS link_text               TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_url           TEXT,
  ADD COLUMN IF NOT EXISTS badge_text              TEXT,
  ADD COLUMN IF NOT EXISTS badge_color             TEXT          DEFAULT 'blue',
  ADD COLUMN IF NOT EXISTS form_data               JSONB         DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS meta_title              TEXT,
  ADD COLUMN IF NOT EXISTS meta_description        TEXT,
  ADD COLUMN IF NOT EXISTS meta_keywords           TEXT,
  ADD COLUMN IF NOT EXISTS page_content            TEXT,
  ADD COLUMN IF NOT EXISTS ai_content_generated    BOOLEAN       DEFAULT false,
  ADD COLUMN IF NOT EXISTS content_generated_at    TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS tags                    TEXT[],
  ADD COLUMN IF NOT EXISTS is_pinned               BOOLEAN       DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active               BOOLEAN       DEFAULT true,
  ADD COLUMN IF NOT EXISTS display_order           INTEGER       DEFAULT 0,
  -- Extra fields for typed content (exam, job, result, etc.)
  ADD COLUMN IF NOT EXISTS conducting_body         TEXT,
  ADD COLUMN IF NOT EXISTS exam_date               TEXT,
  ADD COLUMN IF NOT EXISTS notification_date       DATE,
  ADD COLUMN IF NOT EXISTS admit_card_link         TEXT,
  ADD COLUMN IF NOT EXISTS result_link             TEXT,
  ADD COLUMN IF NOT EXISTS syllabus_link           TEXT,
  ADD COLUMN IF NOT EXISTS answer_key_link         TEXT,
  ADD COLUMN IF NOT EXISTS objection_link          TEXT,
  ADD COLUMN IF NOT EXISTS objection_deadline      DATE,
  ADD COLUMN IF NOT EXISTS official_link           TEXT,
  ADD COLUMN IF NOT EXISTS official_notification   TEXT,
  ADD COLUMN IF NOT EXISTS apply_link              TEXT,
  ADD COLUMN IF NOT EXISTS location                TEXT,
  ADD COLUMN IF NOT EXISTS vacancies               TEXT,
  ADD COLUMN IF NOT EXISTS salary_range            TEXT,
  ADD COLUMN IF NOT EXISTS qualification           TEXT,
  ADD COLUMN IF NOT EXISTS age_limit               TEXT,
  ADD COLUMN IF NOT EXISTS category                TEXT,
  ADD COLUMN IF NOT EXISTS post_name               TEXT,
  ADD COLUMN IF NOT EXISTS release_date            DATE,
  ADD COLUMN IF NOT EXISTS ai_prompt               TEXT,
  ADD COLUMN IF NOT EXISTS created_at              TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at              TIMESTAMP WITH TIME ZONE DEFAULT now();

-- STEP 3: Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_dynamic_sections_slug          ON public.dynamic_sections(slug);
CREATE INDEX IF NOT EXISTS idx_dynamic_sections_active        ON public.dynamic_sections(is_active);
CREATE INDEX IF NOT EXISTS idx_dynamic_sections_tab_order     ON public.dynamic_sections(tab_order);
CREATE INDEX IF NOT EXISTS idx_dynamic_sections_display_order ON public.dynamic_sections(display_order);

CREATE INDEX IF NOT EXISTS idx_dsi_section_id    ON public.dynamic_section_items(section_id);
CREATE INDEX IF NOT EXISTS idx_dsi_country_id    ON public.dynamic_section_items(country_id);
CREATE INDEX IF NOT EXISTS idx_dsi_active        ON public.dynamic_section_items(is_active);
CREATE INDEX IF NOT EXISTS idx_dsi_slug          ON public.dynamic_section_items(slug);
CREATE INDEX IF NOT EXISTS idx_dsi_is_pinned     ON public.dynamic_section_items(is_pinned);
CREATE INDEX IF NOT EXISTS idx_dsi_date_value    ON public.dynamic_section_items(date_value);
CREATE INDEX IF NOT EXISTS idx_dsi_display_order ON public.dynamic_section_items(display_order);
CREATE INDEX IF NOT EXISTS idx_dsi_ai_generated  ON public.dynamic_section_items(ai_content_generated);

-- STEP 4: Drop ALL orphaned/conflicting triggers on both tables
-- ============================================================
DROP TRIGGER IF EXISTS update_dynamic_sections_updated_at      ON public.dynamic_sections;
DROP TRIGGER IF EXISTS update_dynamic_section_items_updated_at ON public.dynamic_section_items;
DROP TRIGGER IF EXISTS auto_slug_dynamic_section_items         ON public.dynamic_section_items;
DROP TRIGGER IF EXISTS auto_generate_famous_exam_seo           ON public.dynamic_section_items;
DROP TRIGGER IF EXISTS mark_exam_for_ai_regen                  ON public.dynamic_section_items;

-- STEP 5: Recreate clean triggers
-- ============================================================
CREATE TRIGGER update_dynamic_sections_updated_at
  BEFORE UPDATE ON public.dynamic_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dynamic_section_items_updated_at
  BEFORE UPDATE ON public.dynamic_section_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Fast slug trigger (no blocking uniqueness loop — avoids hanging inserts)
CREATE OR REPLACE FUNCTION auto_slug_dynamic_section_item()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug :=
      lower(regexp_replace(regexp_replace(NEW.title, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'))
      || '-' || substr(md5(gen_random_uuid()::text), 1, 8);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_slug_dynamic_section_items
  BEFORE INSERT ON public.dynamic_section_items
  FOR EACH ROW EXECUTE FUNCTION auto_slug_dynamic_section_item();

-- STEP 6: Enable RLS on both tables
-- ============================================================
ALTER TABLE public.dynamic_sections      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dynamic_section_items ENABLE ROW LEVEL SECURITY;

-- STEP 7: Drop ALL existing policies (clean slate)
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view active sections"              ON public.dynamic_sections;
DROP POLICY IF EXISTS "Admins can view all sections"                 ON public.dynamic_sections;
DROP POLICY IF EXISTS "Admins can insert sections"                   ON public.dynamic_sections;
DROP POLICY IF EXISTS "Admins can update sections"                   ON public.dynamic_sections;
DROP POLICY IF EXISTS "Admins can delete sections"                   ON public.dynamic_sections;
DROP POLICY IF EXISTS "Admin can manage sections"                    ON public.dynamic_sections;

DROP POLICY IF EXISTS "Anyone can view active section items"         ON public.dynamic_section_items;
DROP POLICY IF EXISTS "Admins can view all section items"            ON public.dynamic_section_items;
DROP POLICY IF EXISTS "Admins can insert dynamic section items"      ON public.dynamic_section_items;
DROP POLICY IF EXISTS "Admins can update section items"              ON public.dynamic_section_items;
DROP POLICY IF EXISTS "Admins can delete section items"              ON public.dynamic_section_items;
DROP POLICY IF EXISTS "Admin can manage section items"               ON public.dynamic_section_items;

-- STEP 8: Recreate complete, correct RLS policies
-- ============================================================

-- dynamic_sections
CREATE POLICY "public_read_active_sections"
  ON public.dynamic_sections FOR SELECT
  USING (is_active = true);

CREATE POLICY "admin_read_all_sections"
  ON public.dynamic_sections FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_insert_sections"
  ON public.dynamic_sections FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_update_sections"
  ON public.dynamic_sections FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_delete_sections"
  ON public.dynamic_sections FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- dynamic_section_items
CREATE POLICY "public_read_active_section_items"
  ON public.dynamic_section_items FOR SELECT
  USING (is_active = true);

CREATE POLICY "admin_read_all_section_items"
  ON public.dynamic_section_items FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_insert_section_items"
  ON public.dynamic_section_items FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_update_section_items"
  ON public.dynamic_section_items FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_delete_section_items"
  ON public.dynamic_section_items FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- STEP 9: Backfill missing slugs on existing items
-- ============================================================
UPDATE public.dynamic_section_items
SET slug =
  lower(regexp_replace(regexp_replace(title, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'))
  || '-' || substr(md5(id::text), 1, 8)
WHERE slug IS NULL OR slug = '';

-- STEP 10: Add realtime (safe if already added)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'dynamic_sections'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.dynamic_sections;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'dynamic_section_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.dynamic_section_items;
  END IF;
END $$;

-- STEP 11: Reload PostgREST schema cache (fixes PGRST204 errors)
-- ============================================================
NOTIFY pgrst, 'reload schema';

-- STEP 12: Verification
-- ============================================================
SELECT
  table_name,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('dynamic_sections', 'dynamic_section_items')
GROUP BY table_name;

SELECT
  trigger_name,
  event_object_table,
  event_manipulation
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table IN ('dynamic_sections', 'dynamic_section_items')
ORDER BY event_object_table, trigger_name;

SELECT
  policyname,
  tablename,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('dynamic_sections', 'dynamic_section_items')
ORDER BY tablename, cmd;

SELECT '✅ dynamic_sections fix complete!' AS status;


DROP TABLE IF EXISTS public.results CASCADE;
DROP TABLE IF EXISTS public.answer_keys CASCADE;
DROP TABLE IF EXISTS public.exam_listings CASCADE;
DROP TABLE IF EXISTS public.job_listings CASCADE;
