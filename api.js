// api.js
import { CONFIG } from './config.js';

export let supabaseClient = null;

export async function initSupabase() {
    try {
        if (window.supabase) {
            supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, { auth: { persistSession: true } });
            return { ok: true };
        } else {
            console.warn('Supabase library not loaded');
            return { ok: false, error: 'Supabase library not loaded' };
        }
    } catch (err) {
        console.error('Supabase init failed', err);
        return { ok: false, error: err };
    }
}

export async function uploadToStorage(path, file) {
    if (!supabaseClient) throw new Error('Supabase not initialized');
    const { data, error } = await supabaseClient.storage.from(CONFIG.STORAGE_BUCKET).upload(path, file, { cacheControl: '3600', upsert: false });
    if (error) throw error;
    return data;
}

export function getPublicUrl(path) {
    if (!supabaseClient) throw new Error('Supabase not initialized');
    const { data } = supabaseClient.storage.from(CONFIG.STORAGE_BUCKET).getPublicUrl(path);
    return data.publicUrl;
}

export async function insertFrame(record) {
    if (!supabaseClient) throw new Error('Supabase not initialized');
    const { error } = await supabaseClient.from(CONFIG.DB_TABLE).insert([record]);
    if (error) throw error;
    return true;
}

export async function fetchUserFrames(userId) {
    if (!supabaseClient) throw new Error('Supabase not initialized');
    const { data, error } = await supabaseClient.from(CONFIG.DB_TABLE).select('id, title, description, photo_url, video_url, created_at').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw error;
    return data;
}

export async function fetchFrameById(id) {
    if (!supabaseClient) throw new Error('Supabase not initialized');
    const { data, error } = await supabaseClient.from(CONFIG.DB_TABLE).select('id, title, description, photo_url, video_url, created_at').eq('id', id).single();
    if (error) throw error;
    return data;
}

export function sanitizeFilename(name) {
    return name.replace(/[^a-z0-9_.-]/gi, '_');
}

