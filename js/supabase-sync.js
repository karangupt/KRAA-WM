/* Workspace App — Supabase data sync
   ------------------------------------------------------------
   Mirrors the existing Google Sheets sync pattern (js/sheets-api.js):
   pushCollection() replaces everything in that collection+workspace
   with the current local set; pullAll() reads everything back grouped
   by collection. The local Store (localStorage) stays the source of
   truth that the UI reads/writes synchronously — this layer just keeps
   Supabase in sync in the background, same as Sheets already does.
*/

const SupabaseSync = (() => {
  const WORKSPACE_ID = '00000000-0000-0000-0000-000000000001';

  async function pushCollection(collection, records) {
    try {
      const { error: delErr } = await supabaseClient
        .from('records')
        .delete()
        .eq('workspace_id', WORKSPACE_ID)
        .eq('collection', collection);
      if (delErr) throw delErr;

      if (records.length) {
        const rows = records.map(r => ({
          workspace_id: WORKSPACE_ID,
          collection,
          local_id: r.id,
          data: r
        }));
        const { error: insErr } = await supabaseClient.from('records').insert(rows);
        if (insErr) throw insErr;
      }
      return { ok: true };
    } catch (e) {
      console.error('Supabase push failed for', collection, e);
      return { ok: false, error: e.message };
    }
  }

  async function pullAll() {
    try {
      const { data, error } = await supabaseClient
        .from('records')
        .select('collection, data')
        .eq('workspace_id', WORKSPACE_ID);
      if (error) throw error;
      const grouped = {};
      data.forEach(row => {
        if (!grouped[row.collection]) grouped[row.collection] = [];
        grouped[row.collection].push(row.data);
      });
      return { ok: true, data: grouped };
    } catch (e) {
      console.error('Supabase pull failed', e);
      return { ok: false, error: e.message };
    }
  }

  async function ping() {
    try {
      const { error } = await supabaseClient.from('records').select('id').limit(1);
      return !error;
    } catch (e) {
      return false;
    }
  }

  return { pushCollection, pullAll, ping, WORKSPACE_ID };
})();
