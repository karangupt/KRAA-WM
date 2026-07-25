/* Workspace App — Supabase Auth
   ------------------------------------------------------------
   Real per-user login (email + password), replacing the old single
   shared password. User accounts are created by the admin (Karan) in
   the Supabase dashboard: Authentication → Users → Add User — there
   is no public self-signup form in this app.
*/

const SupaAuth = (() => {
  async function login(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };
    return { ok: true, user: data.user };
  }

  async function logout() {
    await supabaseClient.auth.signOut();
    location.reload();
  }

  async function getSession() {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) { console.error('getSession failed', error); return null; }
    return data.session || null;
  }

  async function getCurrentUser() {
    const { data, error } = await supabaseClient.auth.getUser();
    if (error) return null;
    return data.user || null;
  }

  // Profile holds the role (owner/manager/staff/family/viewer) and
  // workspace_id — this is what Phase 3 RBAC will read from.
  async function getProfile() {
    const user = await getCurrentUser();
    if (!user) return null;
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (error) { console.error('Could not load profile', error); return null; }
    return data;
  }

  return { login, logout, getSession, getCurrentUser, getProfile };
})();
