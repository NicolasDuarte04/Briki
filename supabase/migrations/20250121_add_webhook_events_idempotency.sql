-- Create webhook_events table for idempotency tracking
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id VARCHAR(255) NOT NULL UNIQUE,
  event_type VARCHAR(100) NOT NULL,
  processed_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  subscription_id VARCHAR(255),
  user_id UUID,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ(6) DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe_event_id ON public.webhook_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON public.webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed_at ON public.webhook_events(processed_at);
CREATE INDEX IF NOT EXISTS idx_webhook_events_subscription_id ON public.webhook_events(subscription_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_user_id ON public.webhook_events(user_id);

-- Add comment for documentation
COMMENT ON TABLE public.webhook_events IS 'Tracks processed Stripe webhook events for idempotency';
COMMENT ON COLUMN public.webhook_events.stripe_event_id IS 'Unique Stripe event ID (evt_xxx)';
COMMENT ON COLUMN public.webhook_events.success IS 'Whether event was processed successfully';

-- Enable RLS (webhook processing should be system-level only)
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Policy: Only allow system inserts (webhook handler can insert
CREATE POLICY "System can insert webhook events"
  ON public.webhook_events
  FOR INSERT
  WITH CHECK (true);

-- Policy: System can read webhook events
CREATE POLICY "System can read webhook events"
  ON public.webhook_events
  FOR SELECT
  USING (true);

