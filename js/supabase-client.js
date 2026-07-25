/* Workspace App — Supabase client init
   ------------------------------------------------------------
   The anon key below is meant to be public/embeddable in client-side
   code — it cannot bypass Row Level Security. Never put the
   "service_role" key here or anywhere in this repo.
*/

const SUPABASE_URL = 'https://jejnlubfqvdrowbwipqy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Implam5sdWJmcXZkcm93YndpcHF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5NDAzMzcsImV4cCI6MjEwMDUxNjMzN30.tbG7QOUgMmihWdXT0-3t0DV73WZMCGMq_Cyxg3XfE6s';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
