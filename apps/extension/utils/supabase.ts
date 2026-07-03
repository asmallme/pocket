import { createClient } from "@supabase/supabase-js";

/** Session storage backed by browser.storage.local so it survives popup close. */
const extensionStorage = {
  getItem: async (key: string) => {
    const result = await browser.storage.local.get(key);
    return (result[key] as string) ?? null;
  },
  setItem: async (key: string, value: string) => {
    await browser.storage.local.set({ [key]: value });
  },
  removeItem: async (key: string) => {
    await browser.storage.local.remove(key);
  },
};

export const supabase = createClient(
  import.meta.env.WXT_SUPABASE_URL,
  import.meta.env.WXT_SUPABASE_ANON_KEY,
  {
    auth: {
      storage: extensionStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
