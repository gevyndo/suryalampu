/* ============================================================
   supabase.js — Supabase client initialisation
   Must be loaded AFTER the Supabase CDN <script> tag.
   ============================================================ */

const SUPABASE_URL    = 'https://rjwdoavzlejwhlzsylno.supabase.co';
const SUPABASE_ANON   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqd2RvYXZ6bGVqd2hsenN5bG5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NzM3MjksImV4cCI6MjA5MDU0OTcyOX0.b_YurMPLOirllIXWpFLgX60X6x2_aWLjZFpE0ueVlpg';
const SUPABASE_BUCKET = 'surya';

// `supabase` global is injected by the Supabase CDN <script> tag
window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
