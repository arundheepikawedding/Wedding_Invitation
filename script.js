// Always start from the top on page load (prevents browser restoring scroll position)
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

document.addEventListener('DOMContentLoaded', () => {
    initEnvelope(); initParticles(); initJasminePetals();
    initScrollReveal(); initCountdown();
    initMusicToggle(); initDividerDraw(); initCountUp();
    initParallax(); initAkshata();
    initAddToCalendar();
});

/* ===== ENVELOPE PRELOADER ===== */
function initEnvelope() {
    const preloader = document.getElementById('envelope-preloader');
    const video = document.getElementById('envelope-video');
    const prompt = document.getElementById('envelope-prompt');
    if (!preloader || !video) return;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    // === ADAPTIVE VIDEO SOURCE ===
    // Detect screen width to match CSS media queries precisely
    const isPortrait = window.innerWidth <= 768;
    const srcLandscape = video.dataset.srcLandscape;
    const srcPortrait = video.dataset.srcPortrait;

    // Pick the right source: portrait (9:16) for phones, landscape (16:9) for desktop
    video.src = (isPortrait && srcPortrait) ? srcPortrait : srcLandscape;
    video.load(); // Force reload with new source

    // === TIMING CONFIGURATION (per-orientation) ===
    // Adjust these if your portrait video has different timing than the landscape one
    const LOOP_END_TIME = 2.8;                               // When to loop back (seconds)
    const LOOP_BUFFER = 0.3;                              // Seek back early to hide flap
    const ZOOM_START_OFFSET = 2.5;                        // Zoom starts this many seconds before the end
    const MAX_SCALE = 2.5;                                 // Maximum zoom level
    let VIDEO_DURATION = 8.0;                                // Fallback; auto-detected below
    let ZOOM_START_TIME = VIDEO_DURATION - ZOOM_START_OFFSET;

    // Show the "Tap to Open" prompt ONLY when the video is actually ready to play
    video.addEventListener('canplay', () => {
        const spinner = document.getElementById('envelope-spinner');
        if (spinner) spinner.style.opacity = '0';
        
        if (prompt && prompt.style.opacity === '0') {
            prompt.style.animation = 'fadeInUp 1s ease .5s both, promptFloat 3s ease-in-out infinite';
            prompt.style.opacity = '1';
        }
    });

    // Auto-detect actual video duration for perfect zoom/fade sync
    video.addEventListener('loadedmetadata', () => {
        if (video.duration && isFinite(video.duration)) {
            VIDEO_DURATION = video.duration;
            ZOOM_START_TIME = VIDEO_DURATION - ZOOM_START_OFFSET;
            console.log(`[Envelope] Video duration: ${VIDEO_DURATION.toFixed(2)}s, zoom at ${ZOOM_START_TIME.toFixed(2)}s`);
        }
    });

    let userTapped = false;

    // Smooth loop using requestAnimationFrame (checks every ~16ms vs timeupdate's ~250ms)
    video.style.transition = 'opacity 0.15s ease';
    let isSeeking = false; // Guard against re-entry during async seek

    function loopCheck() {
        if (userTapped) return; // stop loop checking once user taps
        if (!isSeeking && video.currentTime >= LOOP_END_TIME - LOOP_BUFFER) {
            isSeeking = true;
            // Brief opacity dip to mask the seek stutter
            video.style.opacity = '0.92';
            video.currentTime = 0;
            // Wait for browser to finish seeking before resuming loop
            video.addEventListener('seeked', function onSeeked() {
                video.removeEventListener('seeked', onSeeked);
                isSeeking = false;
                video.style.opacity = '1';
                video.play().catch(() => {});
            });
        }
        requestAnimationFrame(loopCheck);
    }
    requestAnimationFrame(loopCheck);

    function openEnvelope() {
        if (prompt) prompt.style.display = 'none';

        userTapped = true; // stops the loopCheck rAF
        isSeeking = false; // force clear the seek guard

        // Reset video opacity in case it was mid-dip
        video.style.opacity = '1';
        video.style.transition = '';

        // Bulletproof: keep trying to play until it actually works
        function ensurePlaying() {
            if (video.seeking) {
                // Browser is still seeking — wait and retry
                setTimeout(ensurePlaying, 50);
                return;
            }
            if (video.paused) {
                video.play().then(() => {
                    console.log('Envelope video playing from', video.currentTime.toFixed(2) + 's');
                }).catch(() => {
                    // Still failing, retry
                    setTimeout(ensurePlaying, 50);
                });
            }
        }
        ensurePlaying();

        // Zoom effect uses constants defined at top of initEnvelope()

        // GPU-accelerated hints for buttery smooth scaling
        video.style.willChange = 'transform';
        video.style.transformOrigin = 'center center';

        // Create a soft ivory overlay for the final fade-to-background
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:absolute;inset:0;background:var(--bg-primary);opacity:0;z-index:2;pointer-events:none;will-change:opacity;';
        preloader.appendChild(overlay);

        // Smooth 60fps zoom using requestAnimationFrame
        let zoomActive = true;
        function applyZoom() {
            if (!zoomActive) return;
            const t = video.currentTime;
            if (t >= ZOOM_START_TIME) {
                const progress = (t - ZOOM_START_TIME) / (VIDEO_DURATION - ZOOM_START_TIME);
                const clampedProgress = Math.min(progress, 1);
                // Smooth ease-in-out curve for natural acceleration
                const eased = clampedProgress < 0.5
                    ? 2 * clampedProgress * clampedProgress
                    : 1 - Math.pow(-2 * clampedProgress + 2, 2) / 2;
                const scale = 1 + (MAX_SCALE - 1) * eased;
                video.style.transform = `scale(${scale})`;

                // Fade in overlay during the last 1.2 seconds for a clean transition
                if (t >= VIDEO_DURATION - 1.2) {
                    const fadeProgress = (t - (VIDEO_DURATION - 1.2)) / 1.2;
                    overlay.style.opacity = String(Math.min(fadeProgress, 1));
                }
            }
            requestAnimationFrame(applyZoom);
        }
        requestAnimationFrame(applyZoom);

        // After video completes, fade out preloader
        video.addEventListener('ended', () => {
            // Stop the rAF zoom loop and ensure final state
            zoomActive = false;
            video.style.transform = `scale(${MAX_SCALE})`;
            overlay.style.opacity = '1';

            setTimeout(() => {
                preloader.classList.add('hidden');
                document.body.style.overflow = '';
                document.documentElement.style.overflow = '';
                // Trigger hero reveal + peacocks immediately
                const h = document.querySelector('.hero .reveal');
                if (h) h.classList.add('visible');
                setTimeout(() => initPeacockAnimation(), 500);
            }, 150);
        }, { once: true });
    }

    preloader.addEventListener('click', () => {
        openEnvelope();
        if (window.toggleMusic && !window.isAudioPlaying) {
            window.toggleMusic();
        }
    }, { once: true });
}

/* ===== PARTICLES ===== */
function initParticles() {
    const c = document.getElementById('particles-canvas');
    const ctx = c.getContext('2d');
    const ps = [];
    
    function resize() {
        c.width = innerWidth;
        c.height = innerHeight;
    }
    resize();
    addEventListener('resize', resize);
    
    class Particle {
        constructor() {
            this.reset();
        }
        
        reset() {
            this.x = Math.random() * c.width;
            this.y = Math.random() * c.height;
            this.s = Math.random() * 2 + 0.5;
            this.sx = (Math.random() - 0.5) * 0.3;
            this.sy = (Math.random() - 0.5) * 0.3;
            this.o = Math.random() * 0.2 + 0.05;
            this.os = (Math.random() - 0.5) * 0.003;
            this.h = 35 + Math.random() * 15;
        }
        
        update() {
            this.x += this.sx;
            this.y += this.sy;
            this.o += this.os;
            if (this.o <= 0.03 || this.o >= 0.25) this.os *= -1;
            if (this.x < 0 || this.x > c.width || this.y < 0 || this.y > c.height) this.reset();
        }
        
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.s, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${this.h},60%,45%,${this.o})`;
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.s * 3, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${this.h},60%,45%,${this.o * 0.1})`;
            ctx.fill();
        }
    }
    
    for (let i = 0; i < 45; i++) {
        ps.push(new Particle());
    }
    
    function animate() {
        ctx.clearRect(0, 0, c.width, c.height);
        ps.forEach(p => {
            p.update();
            p.draw();
        });
        requestAnimationFrame(animate);
    }
    animate();
}

/* ===== JASMINE PETALS ===== */
function initJasminePetals() {
    const cont = document.getElementById('jasmine-container');
    if (!cont) return;
    
    // Pre-render 15 petals and let CSS loop them infinitely
    // This entirely eliminates Javascript overhead during scrolling
    for (let i = 0; i < 15; i++) {
        const p = document.createElement('div');
        p.className = 'jasmine-petal';
        p.style.left = Math.random() * 100 + '%';
        p.style.animationDuration = (8 + Math.random() * 8) + 's';
        p.style.animationDelay = (Math.random() * 15) + 's'; // Stagger start times
        
        const sz = (8 + Math.random() * 8) + 'px';
        p.style.width = sz;
        p.style.height = sz;
        cont.appendChild(p);
    }
}

/* ===== SCROLL REVEAL ===== */
function initScrollReveal() {
    // Skip hero reveals — those are triggered by the envelope opening
    const els = document.querySelectorAll('.reveal:not(.hero .reveal)');
    const obs = new IntersectionObserver((entries) => {
        entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
                setTimeout(() => entry.target.classList.add('visible'), i * 150);
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(el => obs.observe(el));
}

/* ===== SCROLL PARALLAX ===== */
function initParallax() {
    const mandala = document.querySelector('.hero-mandala-wrapper');
    const entranceLeft = document.querySelector('.entrance-left');
    const entranceRight = document.querySelector('.entrance-right');
    const gopuram = document.querySelector('.gopuram-container');
    const hero = document.getElementById('hero');
    const invocation = document.getElementById('invocation');

    // Use IntersectionObserver to track visibility and stop calculations when not in view
    let heroVisible = true;
    let invVisible = false;
    let gopuramVisible = false;

    const obs = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.target === hero) heroVisible = e.isIntersecting;
            if (e.target === invocation) invVisible = e.isIntersecting;
            if (e.target === gopuram) gopuramVisible = e.isIntersecting;
        });
    }, { rootMargin: '100px' });

    if (hero) obs.observe(hero);
    if (invocation) obs.observe(invocation);
    if (gopuram) obs.observe(gopuram);

    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                const scrollY = window.scrollY;
                const vh = window.innerHeight;

                // Mandala moves slower (parallax depth)
                if (mandala && heroVisible) {
                    mandala.style.transform = `translate(-50%, calc(-50% + ${scrollY * .15}px))`;
                }

                // Entrance pillars float up slightly
                if (entranceLeft && invVisible && invocation) {
                    const invRect = invocation.getBoundingClientRect();
                    const progress = 1 - (invRect.top / vh);
                    if (progress > 0 && progress < 2) {
                        const offset = progress * 20;
                        entranceLeft.style.transform = `translateY(${-offset}px)`;
                        entranceRight.style.transform = `translateY(${-offset}px)`;
                    }
                }

                // Gopuram subtle parallax
                if (gopuram && gopuramVisible) {
                    const gRect = gopuram.getBoundingClientRect();
                    if (gRect.top < vh && gRect.bottom > 0) {
                        const p = (vh - gRect.top) / (vh + gRect.height);
                        gopuram.style.transform = `translateY(${(p - .5) * -30}px)`;
                    }
                }

                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });
}

/* ===== COUNTDOWN ===== */
function initCountdown() {
    const weddingDate = new Date('2026-08-30T07:40:00+05:30').getTime();
    
    function updateTimer() {
        const diff = weddingDate - Date.now();
        
        if (diff <= 0) {
            ['days', 'hours', 'minutes', 'seconds'].forEach(key => {
                document.getElementById('countdown-' + key).textContent = '00';
            });
            return;
        }
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        document.getElementById('countdown-days').textContent = String(days).padStart(2, '0');
        document.getElementById('countdown-hours').textContent = String(hours).padStart(2, '0');
        document.getElementById('countdown-minutes').textContent = String(minutes).padStart(2, '0');
        document.getElementById('countdown-seconds').textContent = String(seconds).padStart(2, '0');
    }
    
    updateTimer();
    setInterval(updateTimer, 1000);
}

/* ===== MUSIC TOGGLE ===== */
window.globalAudio = null;
window.isAudioPlaying = false;

function initMusicToggle() {
    const t = document.getElementById('music-toggle');
    t.classList.add('muted');

    window.toggleMusic = function() {
        if (!window.globalAudio) {
            window.globalAudio = new Audio('assets/The_Auspicious_Sun.mp3');
            window.globalAudio.loop = true;
            window.globalAudio.volume = 0.4;
        }
        if (window.isAudioPlaying) {
            window.globalAudio.pause();
            t.classList.add('muted');
        } else {
            window.globalAudio.play().catch(() => { });
            t.classList.remove('muted');
        }
        window.isAudioPlaying = !window.isAudioPlaying;
    };

    t.addEventListener('click', window.toggleMusic);
}

/* ===== DIVIDER DRAW ===== */
function initDividerDraw() {
    const obs = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('drawn'); obs.unobserve(e.target) } });
    }, { threshold: 0.5 });
    document.querySelectorAll('.section-divider').forEach(d => obs.observe(d));
}

/* ===== COUNT UP ===== */
function initCountUp() {
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const target = parseInt(el.dataset.count);
                let current = 0;
                
                const timer = setInterval(() => {
                    current += target / 24;
                    if (current >= target) {
                        current = target;
                        clearInterval(timer);
                    }
                    el.textContent = Math.round(current);
                }, 50);
                
                observer.unobserve(el);
            }
        });
    }, { threshold: 0.5 });
    
    document.querySelectorAll('[data-count]').forEach(node => observer.observe(node));
}

/* ===== PEACOCK VIDEOS ===== */
function initPeacockAnimation() {
    setupPeacock('left');
    setupPeacock('right');
}

function setupPeacock(side) {
    const container = document.getElementById('peacock-anim-' + side);
    const video = document.getElementById('peacock-video-' + side);
    if (!container || !video) return;

    container.classList.add('visible');
    video.play().then(() => {
        // Only start the CSS movement after the video successfully starts playing
        // Add a slight delay because the peacock video might have a static starting frame
        setTimeout(() => {
            container.classList.add('walking');
        }, 300);
        console.log('Peacock ' + side + ' playing');
    }).catch(e => {
        document.addEventListener('click', function retry() {
            video.play().then(() => {
                container.classList.add('visible');
                setTimeout(() => {
                    container.classList.add('walking');
                }, 300);
            }).catch(() => {});
            document.removeEventListener('click', retry);
        }, { once: true });
    });

    container.addEventListener('animationend', () => {
        if (side === 'left') {
            container.style.left = 'calc(15% - 160px)';
        } else {
            container.style.right = 'calc(15% - 160px)';
        }
    }, { once: true });
}

/* ===== AKSHATA (Sacred Rice) SHOWER — Optimized ===== */
function initAkshata() {
    const muhurtham = document.querySelector('[data-event="muhurtham"]');
    if (!muhurtham) return;

    // Pre-create the DOM elements once to prevent GC thrashing
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;inset:0;z-index:200;pointer-events:none;display:none;';
    document.body.appendChild(container);

    for (let i = 0; i < 35; i++) {
        const g = document.createElement('div');
        g.className = 'akshata-grain';
        g.style.left = (10 + Math.random() * 80) + '%';
        g.style.top = '-10px';
        g.style.animationDuration = (2 + Math.random() * 3) + 's';
        g.style.animationDelay = (Math.random() * 5) + 's'; // Stagger start
        const size = 3 + Math.random() * 4;
        g.style.width = size + 'px';
        g.style.height = (size * 2) + 'px';
        // Note: initial transform rotation is handled, animation will override it but that's fine
        g.style.transform = `rotate(${Math.random() * 360}deg)`;
        container.appendChild(g);
    }

    const obs = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                container.style.display = 'block'; // Reveal the infinitely looping CSS grains
            } else {
                container.style.display = 'none'; // Hide and pause rendering to save battery
            }
        });
    }, { threshold: 0.1 });

    obs.observe(muhurtham);
}

/* ===== ADD TO CALENDAR (.ics) ===== */
function initAddToCalendar() {
    document.querySelectorAll('.add-to-cal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const title = btn.dataset.title;
            const date = btn.dataset.date;
            const startTime = btn.dataset.time;
            const endTime = btn.dataset.end;
            const desc = btn.dataset.desc;
            const location = btn.dataset.location || 'Venue to be updated';
            const mapUrl = btn.dataset.map || '';

            // Format: 20260615T090000
            const dtStart = date.replace(/-/g, '') + 'T' + startTime.replace(':', '') + '00';
            const dtEnd = date.replace(/-/g, '') + 'T' + endTime.replace(':', '') + '00';

            // Append map link to description so it's clickable in calendar apps
            const fullDesc = mapUrl ? desc + '\\nVenue: ' + location + '\\nMap: ' + mapUrl : desc;

            const icsContent = [
                'BEGIN:VCALENDAR',
                'VERSION:2.0',
                'PRODID:-//Arun & Dheepika Wedding//EN',
                'BEGIN:VEVENT',
                'DTSTART;TZID=Asia/Kolkata:' + dtStart,
                'DTEND;TZID=Asia/Kolkata:' + dtEnd,
                'SUMMARY:' + title,
                'DESCRIPTION:' + fullDesc,
                'LOCATION:' + location,
                ...(mapUrl ? ['URL:' + mapUrl] : []),
                'STATUS:CONFIRMED',
                'BEGIN:VALARM',
                'TRIGGER:-PT1H',
                'ACTION:DISPLAY',
                'DESCRIPTION:Reminder',
                'END:VALARM',
                'END:VEVENT',
                'END:VCALENDAR'
            ].join('\r\n');

            const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = title.replace(/[^a-zA-Z0-9]/g, '_') + '.ics';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    });
}

