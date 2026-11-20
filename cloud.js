// Public connection settings. The publishable key is meant to be public: database rules (RLS) protect the data.
// NEVER put a "secret" or "service_role" key in this file.
window.AUBEL = {
  url: "https://veegzlshfayoqtncmugm.supabase.co",
  key: "sb_publishable_D-dBx9GbHz2SOob5MD4kxQ_YQKzrc5Q",
};
window.sb = window.supabase.createClient(window.AUBEL.url, window.AUBEL.key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});
