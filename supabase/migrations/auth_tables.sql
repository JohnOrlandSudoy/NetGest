-- Note: Supabase already provides auth.users table for basic authentication
-- This SQL creates additional tables for your application's specific needs

-- Create a profiles table linked to auth.users
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    avatar_url TEXT,
    role TEXT DEFAULT 'user'::text NOT NULL,
    last_login TIMESTAMP WITH TIME ZONE
);

-- Create RLS (Row Level Security) policies for the profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view their own profile
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Policy to allow users to update their own profile
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

-- Create a function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name)
    VALUES (new.id, new.raw_user_meta_data->>'name');
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to automatically create a profile when a new user signs up
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create a table for user settings
CREATE TABLE public.user_settings (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    notification_preferences JSONB DEFAULT '{"email": true, "push": true}'::jsonb,
    dashboard_layout JSONB,
    theme TEXT DEFAULT 'light',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS for user_settings
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view their own settings
CREATE POLICY "Users can view their own settings" 
ON public.user_settings 
FOR SELECT 
USING (auth.uid() = id);

-- Policy to allow users to update their own settings
CREATE POLICY "Users can update their own settings" 
ON public.user_settings 
FOR UPDATE 
USING (auth.uid() = id);

-- Create a function to handle new user settings
CREATE OR REPLACE FUNCTION public.handle_new_user_settings() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_settings (id)
    VALUES (new.id);
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to automatically create user settings when a new user signs up
CREATE TRIGGER on_auth_user_created_settings
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_settings();

-- Create a table for user roles and permissions
CREATE TABLE public.roles (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Insert default roles
INSERT INTO public.roles (name, description) VALUES
('admin', 'Administrator with full access'),
('user', 'Regular user with standard access'),
('analyst', 'User with access to analytics features');

-- Create a table for user role assignments
CREATE TABLE public.user_roles (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES public.roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    PRIMARY KEY (user_id, role_id)
);

-- Enable RLS for user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policy to allow admins to view all user roles
CREATE POLICY "Admins can view all user roles" 
ON public.user_roles 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
);

-- Policy to allow users to view their own roles
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX idx_profiles_id ON public.profiles(id);
CREATE INDEX idx_user_settings_id ON public.user_settings(id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON public.user_roles(role_id);