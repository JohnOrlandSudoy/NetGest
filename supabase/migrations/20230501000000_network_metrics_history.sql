-- Create network metrics history table
CREATE TABLE public.network_metrics_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interface_name TEXT NOT NULL,
    latency DECIMAL(10, 2),
    packet_loss DECIMAL(10, 2),
    download_speed DECIMAL(10, 2),
    upload_speed DECIMAL(10, 2),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_id UUID REFERENCES auth.users(id),
    source TEXT DEFAULT 'dashboard'
);

-- Add indexes for faster queries
CREATE INDEX idx_network_metrics_interface ON public.network_metrics_history(interface_name);
CREATE INDEX idx_network_metrics_timestamp ON public.network_metrics_history(timestamp);
CREATE INDEX idx_network_metrics_user ON public.network_metrics_history(user_id);

-- Add RLS policies
ALTER TABLE public.network_metrics_history ENABLE ROW LEVEL SECURITY;

-- Allow users to see only their own data
CREATE POLICY "Users can view their own metrics" 
    ON public.network_metrics_history
    FOR SELECT
    USING (auth.uid() = user_id);

-- Allow users to insert their own data
CREATE POLICY "Users can insert their own metrics" 
    ON public.network_metrics_history
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create a function to clean up old data (keep only last 30 days by default)
CREATE OR REPLACE FUNCTION public.cleanup_old_network_metrics()
RETURNS void AS $$
BEGIN
    DELETE FROM public.network_metrics_history
    WHERE timestamp < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled job to run cleanup daily
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('0 0 * * *', 'SELECT public.cleanup_old_network_metrics()');