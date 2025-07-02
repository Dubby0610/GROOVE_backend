import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || "https://lyqvnzjsizpxvopqgkej.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5cXZuempzaXpweHZvcHFna2VqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTMyMzgyMywiZXhwIjoyMDY2ODk5ODIzfQ.OSt-yiC8HwJtg1t3pdlce-fVyTah0rgPgJFrytZOr0k",
);

export default supabase; 