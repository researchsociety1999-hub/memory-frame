// index.js
import { CONFIG } from './config.js';
import { initSupabase, uploadToStorage, getPublicUrl, insertFrame, fetchUserFrames, supabaseClient, sanitizeFilename } from './api.js';

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    // Wait for Supabase script to load if it hasn't already
    if (!window.supabase) {
        await new Promise(resolve => {
            const check = setInterval(() => {
                if (window.supabase) {
                    clearInterval(check);
                    resolve();
                }
            }, 100);
        });
    }

    await initSupabase();
    initUI();
    initVisuals();
    registerServiceWorker();
});

function initUI() {
    // Basic DOM references
    const signUpBtn = document.getElementById('signUpBtn');
    const signInBtn = document.getElementById('signInBtn');
    const signOutBtn = document.getElementById('signOutBtn');
    const authMsg = document.getElementById('authMsg');
    const uploaderCard = document.getElementById('uploaderCard');
    const uploaderForm = document.getElementById('frameForm');
    const uploadMsg = document.getElementById('uploadMsg');
    const userFramesEl = document.getElementById('userFrames');
    const refreshFramesBtn = document.getElementById('refreshFrames');
    const orderForm = document.getElementById('orderForm');
    const orderMsg = document.getElementById('orderMsg');

    function escapeHtml(str) { if (!str) return ''; return str.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '<', '>': '>', '"': '"', "'": '&#39;' }[m])); }

    // Check current auth status
    async function checkUser() {
        if (!supabaseClient) return;
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            uploaderCard.classList.remove('hidden');
            uploaderCard.setAttribute('aria-hidden', 'false');
            signOutBtn.classList.remove('hidden');
            refreshUserFrames();
        }
    }
    checkUser();

    // Sign up
    if (signUpBtn) {
        signUpBtn.addEventListener('click', async () => {
            const email = document.getElementById('authEmail').value.trim();
            const password = document.getElementById('authPassword').value;
            if (!email || !password) { authMsg.textContent = 'Please provide email and password.'; authMsg.style.color = '#ff6b6b'; return; }
            try {
                authMsg.textContent = 'Creating account...';
                const { data, error } = await supabaseClient.auth.signUp({ email, password });
                if (error) throw error;
                authMsg.textContent = 'Check your email for confirmation.';
            } catch (err) {
                authMsg.textContent = err.message || 'Sign up failed.';
                authMsg.style.color = '#ff6b6b';
            }
        });
    }

    // Sign in
    if (signInBtn) {
        signInBtn.addEventListener('click', async () => {
            const email = document.getElementById('authEmail').value.trim();
            const password = document.getElementById('authPassword').value;
            if (!email || !password) { authMsg.textContent = 'Please provide email and password.'; authMsg.style.color = '#ff6b6b'; return; }
            try {
                authMsg.textContent = 'Signing in...';
                const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
                if (error) throw error;
                authMsg.textContent = 'Signed in successfully.';
                await refreshUserFrames();
                uploaderCard.classList.remove('hidden');
                uploaderCard.setAttribute('aria-hidden', 'false');
                signOutBtn.classList.remove('hidden');
            } catch (err) {
                authMsg.textContent = err.message || 'Sign in failed.';
                authMsg.style.color = '#ff6b6b';
            }
        });
    }

    // Sign out
    if (signOutBtn) {
        signOutBtn.addEventListener('click', async () => {
            try {
                await supabaseClient.auth.signOut();
                authMsg.textContent = 'Signed out.';
                uploaderCard.classList.add('hidden');
                uploaderCard.setAttribute('aria-hidden', 'true');
                signOutBtn.classList.add('hidden');
                userFramesEl.innerHTML = '';
            } catch (err) {
                authMsg.textContent = 'Sign out failed.';
                authMsg.style.color = '#ff6b6b';
            }
        });
    }

    // Upload handler
    if (uploaderForm) {
        uploaderForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('frameTitle').value.trim();
            const description = document.getElementById('frameDesc').value.trim();
            const photoFile = document.getElementById('photoInput').files[0];
            const videoFile = document.getElementById('videoInput').files[0];

            if (!title || !photoFile || !videoFile) { uploadMsg.textContent = 'Please provide title, photo, and video.'; uploadMsg.style.color = '#ff6b6b'; return; }
            if (videoFile.size > CONFIG.MAX_VIDEO_BYTES) { uploadMsg.textContent = 'Video exceeds 50MB limit.'; uploadMsg.style.color = '#ff6b6b'; return; }

            try {
                uploadMsg.textContent = 'Uploading files...';
                const { data: { user } } = await supabaseClient.auth.getUser();
                if (!user) throw new Error('You must be signed in to upload.');

                const userId = user.id;
                const timestamp = Date.now();
                const photoPath = `photos/${userId}_${timestamp}_${sanitizeFilename(photoFile.name)}`;
                const videoPath = `videos/${userId}_${timestamp}_${sanitizeFilename(videoFile.name)}`;

                await uploadToStorage(photoPath, photoFile);
                await uploadToStorage(videoPath, videoFile);

                const photoUrl = getPublicUrl(photoPath);
                const videoUrl = getPublicUrl(videoPath);

                await insertFrame({ user_id: userId, title, description, photo_url: photoUrl, video_url: videoUrl });

                uploadMsg.textContent = 'Frame saved successfully.';
                uploaderForm.reset();
                await refreshUserFrames();
            } catch (err) {
                uploadMsg.textContent = err.message || 'Upload failed.';
                uploadMsg.style.color = '#ff6b6b';
            }
        });
    }

    // Refresh frames
    if (refreshFramesBtn) refreshFramesBtn.addEventListener('click', refreshUserFrames);

    async function refreshUserFrames() {
        if (!userFramesEl) return;
        userFramesEl.innerHTML = '<p class="muted">Loading your frames...</p>';
        try {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) { userFramesEl.innerHTML = '<p class="muted">Sign in to view frames.</p>'; return; }
            const frames = await fetchUserFrames(user.id);
            if (!frames || frames.length === 0) { userFramesEl.innerHTML = '<p class="muted">No frames yet. Create your first memory.</p>'; return; }
            userFramesEl.innerHTML = '';
            frames.forEach(frame => {
                const card = document.createElement('div');
                card.className = 'frame-card glass animated-border tilt';
                card.setAttribute('data-tilt', '');
                card.innerHTML = `
              <div class="frame-thumb" style="background-image:url('${frame.photo_url}')"></div>
              <div class="frame-meta">
                <h4>${escapeHtml(frame.title)}</h4>
                <p class="muted">${escapeHtml(frame.description || '')}</p>
                <div class="frame-actions">
                  <a class="btn btn-outline small" href="scan.html?frame=${frame.id}">Open</a>
                  <button class="btn btn-gold small play-btn" data-video="${frame.video_url}">Play</button>
                </div>
              </div>
            `;
                userFramesEl.appendChild(card);
            });
            // Initialize tilt
            if (window.VanillaTilt) {
                document.querySelectorAll('.tilt').forEach(el => VanillaTilt.init(el, { max: 12, speed: 400, glare: true, "max-glare": 0.12 }));
            }
            // Play handlers
            document.querySelectorAll('.play-btn').forEach(btn => btn.addEventListener('click', () => openVideoModal(btn.dataset.video)));
        } catch (err) {
            userFramesEl.innerHTML = '<p class="muted">Failed to load frames.</p>';
            console.error(err);
        }
    }

    // Order form
    if (orderForm) {
        orderForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('orderName').value.trim();
            const email = document.getElementById('orderEmail').value.trim();
            const phone = document.getElementById('orderPhone').value.trim();
            const requirements = document.getElementById('orderReq').value.trim();
            if (!name || !email || !phone) { orderMsg.textContent = 'Please fill in name, email, and phone.'; orderMsg.style.color = '#ff6b6b'; return; }
            try {
                orderMsg.textContent = 'Sending order...';
                if (!window.emailjs) throw new Error('Email service unavailable.');
                await emailjs.init(CONFIG.EMAILJS_PUBLIC_KEY);
                await emailjs.send(CONFIG.EMAILJS_SERVICE_ID, CONFIG.EMAILJS_TEMPLATE_ID, {
                    customer_name: name,
                    customer_email: email,
                    customer_phone: phone,
                    requirements,
                    package: 'Premium Package',
                    price: '$49.99'
                });
                orderMsg.textContent = 'Order submitted. We will contact you shortly.';
                orderForm.reset();
            } catch (err) {
                orderMsg.textContent = err.message || 'Failed to submit order.';
                orderMsg.style.color = '#ff6b6b';
            }
        });
    }

    // Smooth scroll
    document.querySelectorAll('.nav-link').forEach(a => {
        a.addEventListener('click', (e) => {
            const href = a.getAttribute('href');
            if (href && href.startsWith('#')) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // Mobile nav
    const navToggle = document.getElementById('navToggle');
    if (navToggle) navToggle.addEventListener('click', () => document.getElementById('navLinks').classList.toggle('open'));
}

function openVideoModal(videoUrl) {
    const modal = document.createElement('div');
    modal.className = 'video-modal modal-fade in';
    modal.innerHTML = `
          <div class="video-wrap">
            <button class="modal-close" aria-label="Close">✕</button>
            <video controls autoplay playsinline src="${videoUrl}"></video>
          </div>
        `;
    document.body.appendChild(modal);
    document.body.classList.add('no-scroll');
    modal.querySelector('.modal-close').addEventListener('click', () => {
        document.body.removeChild(modal);
        document.body.classList.remove('no-scroll');
    });
}


function initVisuals() {
    // Initialize fade-in animations for sections
    initFadeInAnimations();

    // Particles
    if (window.tsParticles) {
        const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        tsParticles.load('heroParticles', {
            fullScreen: { enable: false },
            particles: { number: { value: prefersReduced ? 20 : 40 }, color: { value: "#ffd700" }, opacity: { value: 0.06 }, size: { value: { min: 1, max: 3 } }, move: { speed: 0.6, enable: true } },
            interactivity: { events: { onhover: { enable: true, mode: "repulse" } } },
            detectRetina: true
        }).catch(e => console.warn('tsParticles failed', e));
    }

    // Slider
    const slider = document.getElementById('heroSlider');
    if (slider) {
        const slides = slider.querySelectorAll('.slide');
        const dotsContainer = document.getElementById('heroDots');
        const interval = parseInt(slider.dataset.interval, 10) || 5000;
        let current = 0;
        let timer;
        slides.forEach((s, i) => {
            const dot = document.createElement('button');
            dot.className = 'dot' + (i === 0 ? ' active' : '');
            dot.dataset.index = i;
            dotsContainer.appendChild(dot);
            dot.addEventListener('click', () => goToSlide(i));
        });
        document.getElementById('prevSlide').addEventListener('click', () => goToSlide(current - 1));
        document.getElementById('nextSlide').addEventListener('click', () => goToSlide(current + 1));
        function goToSlide(index) {
            clearInterval(timer);
            slides[current].classList.remove('active');
            dotsContainer.children[current].classList.remove('active');
            current = (index + slides.length) % slides.length;
            slides[current].classList.add('active');
            dotsContainer.children[current].classList.add('active');
            timer = setInterval(() => goToSlide(current + 1), interval);
        }
        slider.addEventListener('mousemove', (e) => {
            const rect = slider.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            slider.querySelectorAll('.parallax-layer').forEach((layer, i) => {
                const depth = (i + 1) * 6;
                layer.style.transform = `translate3d(${x * depth}px, ${y * depth}px, 0) scale(1.02)`;
            });
        });
        timer = setInterval(() => goToSlide(current + 1), interval);
    }

    // Glitch
    document.querySelectorAll('.glitch').forEach(el => {
        const text = el.textContent;
        el.innerHTML = `<span class="g-main">${text}</span><span class="g-dup">${text}</span><span class="g-dup2">${text}</span>`;
    });

    // Tilt
    if (window.VanillaTilt) {
        document.querySelectorAll('[data-tilt]').forEach(el => VanillaTilt.init(el, { max: 12, speed: 400, glare: true, "max-glare": 0.12 }));
    }

    // Cursor follower
    if (!/Mobi|Android/i.test(navigator.userAgent) && !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
        const dot = document.createElement('div');
        dot.className = 'cursor-follower';
        document.body.appendChild(dot);
        document.addEventListener('mousemove', (e) => { dot.style.left = e.clientX + 'px'; dot.style.top = e.clientY + 'px'; dot.style.transform = 'translate(-50%,-50%) scale(1)'; });
        document.addEventListener('mouseleave', () => dot.style.opacity = '0');
        document.addEventListener('mouseenter', () => dot.style.opacity = '1');
    }


    // Logo draw
    if (window.anime) {
        const path = document.querySelector('#logoPath');
        if (path) anime({ targets: path, strokeDashoffset: [anime.setDashoffset, 0], easing: 'easeInOutSine', duration: 1400, delay: 200 });
    }
}

function initFadeInAnimations() {
    // Create intersection observer for fade-in animations
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    // Observe all elements with fade-in class
    document.querySelectorAll('.fade-in').forEach(el => {
        observer.observe(el);
    });
}

function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    const swCode = `
        const CACHE_NAME = 'memoryframe-cache-v1';
        const ASSETS = [
          '/',
          location.pathname.replace(/index.html$/, '') + 'styles.css'
        ];
        self.addEventListener('install', (e) => {
          self.skipWaiting();
          e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).catch(()=>{}));
        });
        self.addEventListener('activate', (e) => {
          e.waitUntil(self.clients.claim());
        });
        self.addEventListener('fetch', (e) => {
          const url = new URL(e.request.url);
          if (e.request.method !== 'GET') return;
          if (url.origin.includes('supabase.co') || url.pathname.includes('/api/')) {
            e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
            return;
          }
          e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
            if (!resp || resp.status !== 200 || resp.type !== 'basic') return resp;
            const clone = resp.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
            return resp;
          }).catch(()=>caches.match(e.request))));
        });
      `;
    const blob = new Blob([swCode], { type: 'application/javascript' });
    const swUrl = URL.createObjectURL(blob);
    navigator.serviceWorker.register(swUrl).then(reg => {
        console.log('Service worker registered');
    }).catch(err => console.warn('SW registration failed', err));

    // PWA Manifest
    const manifest = {
        name: "MemoryFrame",
        short_name: "MemoryFrame",
        start_url: ".",
        display: "standalone",
        background_color: "#0a0a0a",
        theme_color: "#ffd700",
        icons: [
            { src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='192' height='192'%3E%3Crect width='100%25' height='100%25' fill='%230a0a0a'/%3E%3Ctext x='50%25' y='55%25' font-size='36' font-family='Orbitron' fill='%23ffd700' text-anchor='middle'%3EMF%3C/text%3E%3C/svg%3E", sizes: "192x192", type: "image/svg+xml" }
        ]
    };
    const manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
    const manifestUrl = URL.createObjectURL(manifestBlob);
    const link = document.getElementById('pwa-manifest-link');
    if (link) link.setAttribute('href', manifestUrl);
}

