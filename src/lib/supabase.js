import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const rememberPreferenceKey = 'borrow-and-barter-remember-session'

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase configuration. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env.')
}

const authStorage = {
  getItem(key) {
    const remember = localStorage.getItem(rememberPreferenceKey) !== 'false'
    return (remember ? localStorage : sessionStorage).getItem(key)
  },
  setItem(key, value) {
    const remember = localStorage.getItem(rememberPreferenceKey) !== 'false'
    const selectedStorage = remember ? localStorage : sessionStorage
    const otherStorage = remember ? sessionStorage : localStorage

    selectedStorage.setItem(key, value)
    otherStorage.removeItem(key)
  },
  removeItem(key) {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  },
}

export const setRememberSession = (remember) => {
  localStorage.setItem(rememberPreferenceKey, String(remember))
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: authStorage,
    persistSession: true,
  },
})
