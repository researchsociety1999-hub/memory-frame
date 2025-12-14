// config.js
export const CONFIG = {
    SUPABASE_URL: 'https://natsnkvqokwbrdoqbzrz.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hdHNua3Zxb2t3YnJkb3FienJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc5NjI3MzYsImV4cCI6MjA1MzUzODczNn0.G-jUJe1UKneLftV9dzDWBQ_Dxf2hrJpGGT2E6L_uHSQ',
    EMAILJS_SERVICE_ID: 'service_8dn958k',
    EMAILJS_TEMPLATE_ID: 'template_memoryframe',
    EMAILJS_PUBLIC_KEY: 'user_public_key',
    STORAGE_BUCKET: 'frames',
    DB_TABLE: 'memory_frames',
    MAX_VIDEO_BYTES: 50 * 1024 * 1024,
    cdnFallbacks: {
        supabase: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js',
        emailjs: 'https://cdn.jsdelivr.net/npm/emailjs-com@3/dist/email.min.js',
        vanillaTilt: 'https://cdn.jsdelivr.net/npm/vanilla-tilt@1.7.0/dist/vanilla-tilt.min.js',
        tsParticles: 'https://cdn.jsdelivr.net/npm/tsparticles@2/tsparticles.bundle.min.js',
        anime: 'https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.1/anime.min.js',
        html5qrcode: 'https://unpkg.com/html5-qrcode@2.3.7/minified/html5-qrcode.min.js'
    }
};

