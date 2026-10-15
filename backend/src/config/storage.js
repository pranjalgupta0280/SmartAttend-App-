import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;

const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;

if (url && key) {
    try {
        supabase = createClient(url, key);
    } catch (err) {
        console.error("Failed to initialize Supabase client:", err.message);
    }
} else {
    console.warn(
        "Notice: SUPABASE_URL and SUPABASE_SECRET_KEY are not configured in .env. Photo storage uploads will require Supabase credentials."
    );
}

export default supabase;
