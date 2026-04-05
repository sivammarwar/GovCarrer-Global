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