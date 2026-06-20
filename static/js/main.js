// ── DARK MODE ──
function toggleDark() {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    localStorage.setItem('darkMode', isDark);
    document.getElementById('dark-btn').textContent = isDark ? '☀️' : '🌙';
    initParticles();
}

window.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark');
        const btn = document.getElementById('dark-btn');
        if (btn) btn.textContent = '☀️';
    }
    initParticles();

    const savedVol = localStorage.getItem('soundVolume');
    if (savedVol) {
        soundVolume = parseFloat(savedVol);
        const slider = document.getElementById('volume-slider');
        if (slider) slider.value = soundVolume;
    }
    const savedSound = sessionStorage.getItem('activeSound');
    if (savedSound) {
        const nowEl = document.getElementById('sound-now');
        const btn = document.getElementById('snd-' + savedSound);
        if (nowEl) nowEl.textContent = '▶ Click to resume ' + soundNames[savedSound];
        if (btn) btn.style.outline = '2px solid var(--green)';
    }
});

// ── PARTICLES ──
function initParticles() {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const isDark = document.body.classList.contains('dark');
    const particleColor = isDark ? 'rgba(100,200,140,' : 'rgba(61,145,98,';
    const particles = [];
    for (let i = 0; i < 55; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 3 + 1,
            dx: (Math.random() - 0.5) * 0.5,
            dy: (Math.random() - 0.5) * 0.5,
            alpha: Math.random() * 0.4 + 0.1
        });
    }
    if (window._particleAnimId) cancelAnimationFrame(window._particleAnimId);
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120) {
                    ctx.beginPath();
                    ctx.strokeStyle = particleColor + (0.12 * (1 - dist / 120)) + ')';
                    ctx.lineWidth = 0.8;
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }
        particles.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = particleColor + p.alpha + ')';
            ctx.fill();
            p.x += p.dx; p.y += p.dy;
            if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
            if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
        });
        window._particleAnimId = requestAnimationFrame(draw);
    }
    draw();
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}

// ── CRISIS SUPPORT ──
function openCrisis() {
    document.getElementById('crisis-overlay').classList.add('open');
    document.body.style.overflow = 'hidden';
}
function closeCrisis() {
    document.getElementById('crisis-overlay').classList.remove('open');
    document.body.style.overflow = '';
    stopMiniBreath();
}
function showTab(tab, btn) {
    document.querySelectorAll('.crisis-content').forEach(c => c.classList.add('hidden'));
    document.querySelectorAll('.crisis-tab').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.remove('hidden');
    btn.classList.add('active');
    if (tab !== 'breathe') stopMiniBreath();
}
let miniRunning = false;
let miniTimer = null;
function stopMiniBreath() {
    miniRunning = false;
    clearTimeout(miniTimer);
    const btn = document.getElementById('mini-btn');
    if (btn) btn.textContent = 'Start ▶';
    const ring = document.getElementById('mini-ring');
    if (ring) ring.style.transform = 'scale(1)';
}
async function startMiniBreath() {
    if (miniRunning) { stopMiniBreath(); return; }
    miniRunning = true;
    document.getElementById('mini-btn').textContent = 'Stop ■';
    const phases = [
        { label: 'Inhale', count: 4, scale: 1.3 },
        { label: 'Hold', count: 4, scale: 1.3 },
        { label: 'Exhale', count: 4, scale: 1 },
        { label: 'Hold', count: 4, scale: 1 }
    ];
    let cycle = 0;
    while (miniRunning && cycle < 4) {
        for (const phase of phases) {
            if (!miniRunning) break;
            const ring = document.getElementById('mini-ring');
            const countEl = document.getElementById('mini-count');
            const phaseEl = document.getElementById('mini-phase');
            if (!ring) break;
            phaseEl.textContent = phase.label;
            ring.style.transition = `transform ${phase.count}s ease`;
            ring.style.transform = `scale(${phase.scale})`;
            for (let i = phase.count; i >= 1; i--) {
                if (!miniRunning) break;
                countEl.textContent = i;
                await new Promise(r => miniTimer = setTimeout(r, 1000));
            }
        }
        cycle++;
    }
    stopMiniBreath();
}
async function crisisChat() {
    const input = document.getElementById('crisis-input').value.trim();
    if (!input) return;
    const btn = document.querySelector('#tab-talk .btn-primary');
    btn.textContent = 'Thinking... 💚';
    btn.disabled = true;
    const res = await fetch('/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '🆘 I need support right now: ' + input })
    });
    const data = await res.json();
    const responseEl = document.getElementById('crisis-response');
    responseEl.textContent = data.reply;
    responseEl.style.display = 'block';
    btn.textContent = 'Get Support 💚';
    btn.disabled = false;
}
document.addEventListener('click', function(e) {
    const overlay = document.getElementById('crisis-overlay');
    if (e.target === overlay) closeCrisis();
});

// ── SOUND SYSTEM ──
let audioCtx = null;
let masterGain = null;
let activeSoundNode = null;
let currentSoundKey = null;
let soundVolume = parseFloat(localStorage.getItem('soundVolume') || '0.45');

const soundNames = {
    cosmic: '🌌 Cosmic Dream',
    lullaby: '🌸 Gentle Lullaby'
};

function getCtx() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = soundVolume;
        masterGain.connect(audioCtx.destination);
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
}

function createReverb(ctx, secs) {
    const conv = ctx.createConvolver();
    const len = ctx.sampleRate * secs;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
        const d = buf.getChannelData(c);
        for (let i = 0; i < len; i++) {
            d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
        }
    }
    conv.buffer = buf;
    return conv;
}

function createCosmic(ctx) {
    const nodes = [];
    const intervals = [];
    const reverb = createReverb(ctx, 8);
    const revGain = ctx.createGain();
    revGain.gain.value = 0.7;
    reverb.connect(revGain);
    revGain.connect(masterGain);

    const chords = [
        [130.81, 155.56, 196.00, 261.63],
        [146.83, 174.61, 220.00, 293.66],
        [123.47, 146.83, 185.00, 246.94],
        [138.59, 164.81, 207.65, 277.18],
    ];

    function playPad(freqs, startTime, duration) {
        freqs.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;

            const osc2 = ctx.createOscillator();
            osc2.type = 'triangle';
            osc2.frequency.value = freq * 1.002;

            const sub = ctx.createOscillator();
            sub.type = 'sine';
            sub.frequency.value = freq * 0.5;

            const g = ctx.createGain();
            g.gain.setValueAtTime(0, startTime);
            g.gain.linearRampToValueAtTime(i === 0 ? 0.12 : 0.07, startTime + duration * 0.25);
            g.gain.setValueAtTime(i === 0 ? 0.12 : 0.07, startTime + duration * 0.7);
            g.gain.linearRampToValueAtTime(0.001, startTime + duration);

            const subG = ctx.createGain();
            subG.gain.value = 0.04;

            [osc, osc2].forEach(o => { o.connect(g); o.start(startTime); o.stop(startTime + duration + 0.1); nodes.push(o); });
            sub.connect(subG);
            subG.connect(masterGain);
            sub.start(startTime);
            sub.stop(startTime + duration + 0.1);
            nodes.push(sub);

            g.connect(reverb);
            g.connect(masterGain);
        });
    }

    function addShimmer(startTime) {
        const shimmerFreqs = [1046, 1318, 1568, 2093];
        shimmerFreqs.forEach((freq) => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;

            const g = ctx.createGain();
            const t = startTime + Math.random() * 8;
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.018, t + 0.5);
            g.gain.exponentialRampToValueAtTime(0.001, t + 4);

            osc.connect(g);
            g.connect(reverb);
            g.connect(masterGain);
            osc.start(t);
            osc.stop(t + 5);
            nodes.push(osc);
        });
    }

    function addDrone() {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 65.41;

        const lfo = ctx.createOscillator();
        const lfoG = ctx.createGain();
        lfo.frequency.value = 0.05;
        lfoG.gain.value = 0.02;
        lfo.connect(lfoG);
        lfo.start();

        const g = ctx.createGain();
        g.gain.value = 0.06;
        lfoG.connect(g.gain);

        osc.connect(g);
        g.connect(reverb);
        g.connect(masterGain);
        osc.start();
        nodes.push(osc, lfo);
    }

    addDrone();

    function scheduleChords() {
        const now = ctx.currentTime;
        const chordDuration = 16;
        chords.forEach((chord, i) => {
            playPad(chord, now + i * chordDuration, chordDuration + 2);
            addShimmer(now + i * chordDuration + 4);
        });
    }

    scheduleChords();
    const iv = setInterval(scheduleChords, chords.length * 16 * 1000);
    intervals.push(iv);

    return {
        stop: () => {
            intervals.forEach(i => clearInterval(i));
            nodes.forEach(n => { try { n.stop(); } catch(e){} });
        }
    };
}

function createLullaby(ctx) {
    const nodes = [];
    const intervals = [];
    const reverb = createReverb(ctx, 4);
    const revGain = ctx.createGain();
    revGain.gain.value = 0.55;
    reverb.connect(revGain);
    revGain.connect(masterGain);

    function addWarmPad() {
        const freqs = [261.63, 329.63, 392.00];
        freqs.forEach(freq => {
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.value = freq;

            const lfo = ctx.createOscillator();
            const lfoG = ctx.createGain();
            lfo.frequency.value = 0.08;
            lfoG.gain.value = 0.008;
            lfo.connect(lfoG);
            lfo.start();

            const g = ctx.createGain();
            g.gain.value = 0.055;
            lfoG.connect(g.gain);

            osc.connect(g);
            g.connect(reverb);
            g.connect(masterGain);
            osc.start();
            nodes.push(osc, lfo);
        });
    }

    function pluck(freq, time, vol) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;

        const osc2 = ctx.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.value = freq * 2;

        const g = ctx.createGain();
        g.gain.setValueAtTime(0, time);
        g.gain.linearRampToValueAtTime(vol, time + 0.015);
        g.gain.exponentialRampToValueAtTime(0.001, time + 2.2);

        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(0, time);
        g2.gain.linearRampToValueAtTime(vol * 0.3, time + 0.01);
        g2.gain.exponentialRampToValueAtTime(0.001, time + 1.2);

        osc.connect(g);
        osc2.connect(g2);
        g.connect(reverb);
        g.connect(masterGain);
        g2.connect(reverb);
        g2.connect(masterGain);

        osc.start(time);
        osc2.start(time);
        osc.stop(time + 2.5);
        osc2.stop(time + 1.5);
        nodes.push(osc, osc2);
    }

    const melody = [
        523.25, 587.33, 659.25, 783.99, 659.25,
        587.33, 523.25, 587.33, 659.25, 523.25,
        659.25, 783.99, 880.00, 783.99, 659.25,
        587.33, 523.25, 0,
        783.99, 659.25, 587.33, 523.25, 587.33,
        659.25, 783.99, 523.25, 0, 0,
    ];

    const bass = [
        261.63, 0, 329.63, 0, 392.00,
        0, 261.63, 0, 329.63, 0,
        392.00, 0, 329.63, 0, 261.63,
        0, 392.00, 0, 329.63, 0,
        261.63, 0, 392.00, 0, 329.63,
        0, 261.63, 0, 0, 0,
    ];

    const noteSpacing = 1.4;

    function scheduleMelody() {
        const now = ctx.currentTime + 0.5;
        melody.forEach((freq, i) => {
            if (freq > 0) pluck(freq, now + i * noteSpacing, 0.13);
        });
        bass.forEach((freq, i) => {
            if (freq > 0) pluck(freq, now + i * noteSpacing + noteSpacing * 0.5, 0.07);
        });
    }

    addWarmPad();
    scheduleMelody();

    const totalDuration = melody.length * noteSpacing * 1000 + 3000;
    const iv = setInterval(scheduleMelody, totalDuration);
    intervals.push(iv);

    return {
        stop: () => {
            intervals.forEach(i => clearInterval(i));
            nodes.forEach(n => { try { n.stop(); } catch(e){} });
        }
    };
}

const soundGenerators = {
    cosmic: createCosmic,
    lullaby: createLullaby
};

function playSound(key) {
    const ctx = getCtx();
    if (activeSoundNode) { activeSoundNode.stop(); activeSoundNode = null; }
    document.querySelectorAll('.sound-opt-2').forEach(b => b.classList.remove('active'));

    if (currentSoundKey === key) {
        currentSoundKey = null;
        sessionStorage.removeItem('activeSound');
        updateSoundUI(null);
        return;
    }

    activeSoundNode = soundGenerators[key](ctx);
    currentSoundKey = key;
    sessionStorage.setItem('activeSound', key);

    const btn = document.getElementById('snd-' + key);
    if (btn) btn.classList.add('active');
    updateSoundUI(key);
}

function stopSound() {
    if (activeSoundNode) { activeSoundNode.stop(); activeSoundNode = null; }
    currentSoundKey = null;
    sessionStorage.removeItem('activeSound');
    document.querySelectorAll('.sound-opt-2').forEach(b => b.classList.remove('active'));
    updateSoundUI(null);
}

function updateSoundUI(key) {
    const nowEl = document.getElementById('sound-now');
    const toggleBtn = document.getElementById('sound-toggle-btn');
    if (nowEl) nowEl.textContent = key ? 'Now: ' + soundNames[key] : 'No sound playing';
    if (toggleBtn) {
        toggleBtn.classList.toggle('playing', !!key);
        toggleBtn.textContent = key ? '🔊' : '🎵';
    }
}

function setVolume(val) {
    soundVolume = parseFloat(val);
    if (masterGain) masterGain.gain.value = soundVolume;
    localStorage.setItem('soundVolume', soundVolume);
}

function toggleSoundPanel() {
    const panel = document.getElementById('sound-panel');
    if (panel) panel.classList.toggle('open');
}

document.addEventListener('click', function(e) {
    const player = document.getElementById('sound-player');
    if (player && !player.contains(e.target)) {
        const panel = document.getElementById('sound-panel');
        if (panel) panel.classList.remove('open');
    }
});

// ── CONFETTI ──
function fireConfetti(originEl) {
    const colors = ['#3d9162', '#6c5fc7', '#e8843a', '#d45f7a', '#3a7bc8', '#eab84a'];
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '99999';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    let originX = window.innerWidth / 2;
    let originY = window.innerHeight / 2;
    if (originEl) {
        const rect = originEl.getBoundingClientRect();
        originX = rect.left + rect.width / 2;
        originY = rect.top + rect.height / 2;
    }

    const pieces = [];
    const count = 70;

    for (let i = 0; i < count; i++) {
        const angle = (Math.random() * Math.PI * 2);
        const speed = Math.random() * 7 + 4;
        pieces.push({
            x: originX,
            y: originY,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed - 4,
            size: Math.random() * 7 + 5,
            color: colors[Math.floor(Math.random() * colors.length)],
            rotation: Math.random() * 360,
            rotSpeed: (Math.random() - 0.5) * 14,
            shape: Math.random() > 0.5 ? 'rect' : 'circle',
            gravity: 0.22,
            opacity: 1,
            life: 0
        });
    }

    let frame = 0;
    const maxFrames = 90;

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        frame++;

        pieces.forEach(p => {
            p.x += p.dx;
            p.y += p.dy;
            p.dy += p.gravity;
            p.dx *= 0.99;
            p.rotation += p.rotSpeed;
            p.life++;

            if (p.life > 50) p.opacity = Math.max(0, 1 - (p.life - 50) / 40);

            ctx.save();
            ctx.globalAlpha = p.opacity;
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);
            ctx.fillStyle = p.color;

            if (p.shape === 'rect') {
                ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
            } else {
                ctx.beginPath();
                ctx.arc(0, 0, p.size / 2.5, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        });

        if (frame < maxFrames) {
            requestAnimationFrame(draw);
        } else {
            canvas.remove();
        }
    }

    draw();
}

function celebrateStreak() {
    fireConfetti();
    setTimeout(() => fireConfetti(), 200);
    setTimeout(() => fireConfetti(), 400);
}

// ── SPA NAVIGATION (keeps sound alive across page changes) ──
function navigate(url) {
    fetch(url)
        .then(res => res.text())
        .then(html => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const newContent = doc.querySelector('main.container');
            const oldContent = document.querySelector('main.container');
            if (newContent && oldContent) {
                oldContent.innerHTML = newContent.innerHTML;
            }

            document.querySelectorAll('.nav-links a').forEach(a => {
                a.classList.remove('active');
            });
            const activeLink = document.querySelector(`.nav-links a[href="${url}"]`);
            if (activeLink) activeLink.classList.add('active');

            window.history.pushState({ url }, '', url);

            document.querySelectorAll('.spa-script').forEach(s => s.remove());

            const newScripts = Array.from(doc.querySelectorAll('body script'));

            function runNext(index) {
                if (index >= newScripts.length) return;
                const oldScript = newScripts[index];
                const s = document.createElement('script');
                s.className = 'spa-script';

                if (oldScript.src) {
                    if (oldScript.src.includes('chart.js') && typeof Chart !== 'undefined') {
                        runNext(index + 1);
                        return;
                    }
                    if (oldScript.src.includes('main.js')) {
                        runNext(index + 1);
                        return;
                    s.src = oldScript.src;
                    s.onload = () => runNext(index + 1);
                    s.onerror = () => runNext(index + 1);
                    document.body.appendChild(s);
                } else {
                    s.textContent = oldScript.textContent;
                    document.body.appendChild(s);
                    runNext(index + 1);
                }
            }

            runNext(0);
            window.scrollTo(0, 0);
        })
        .catch(() => {
            window.location.href = url;
        });
}

window.addEventListener('popstate', (e) => {
    if (e.state && e.state.url) navigate(e.state.url);
});
// ── VOICE INPUT (Web Speech API) ──
function initVoiceInput(buttonId, inputId) {
    const btn = document.getElementById(buttonId);
    const input = document.getElementById(inputId);
    if (!btn || !input) return;
    if (btn.dataset.voiceInitialized === 'true') return;
    btn.dataset.voiceInitialized = 'true';

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        btn.style.display = 'none';
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-IN';

    let isListening = false;

    btn.addEventListener('click', () => {
        if (isListening) {
            recognition.stop();
            return;
        }
        try {
            recognition.start();
        } catch (e) {
            console.error('Speech recognition error:', e);
        }
    });

    recognition.onstart = () => {
        isListening = true;
        btn.classList.add('listening');
        btn.title = 'Listening... click to stop';
    };

    recognition.onend = () => {
        isListening = false;
        btn.classList.remove('listening');
        btn.title = 'Click to speak';
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const existing = input.value.trim();
        input.value = existing ? existing + ' ' + transcript : transcript;
        input.dispatchEvent(new Event('input'));
        input.focus();
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
            alert('Microphone access denied. Please allow microphone access to use voice input.');
        }
    };
}