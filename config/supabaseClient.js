import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

console.log("SUPABASE URL: ", supabaseUrl);
console.log("SUPABASE KEY exists: ", !!supabaseKey)

const supabase = createClient(supabaseUrl, supabaseKey)

export default supabase