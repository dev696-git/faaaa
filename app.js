/**
 * CHRONOS LUXE CLOCK & DEVICE EMULATOR
 * Comprehensive Clock Application Engine with Web Audio Synthesizer,
 * World Clock, Precision Stopwatch, Radial Timer, and Sleep Soundscape.
 */

// ============================================================================
// 1. WEB AUDIO SYNTHESIZER ENGINE
// ============================================================================
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.ambientSource = null;
    this.ambientGain = null;
    this.currentAmbient = null;
    this.alarmInterval = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted && this.ambientGain) {
      this.ambientGain.gain.setValueAtTime(0, this.ctx.currentTime);
    } else if (!this.isMuted && this.ambientGain) {
      this.ambientGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    }
    return !this.isMuted;
  }

  playTone(freq = 440, type = 'sine', duration = 0.15, gainLevel = 0.2) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(gainLevel, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio playback error', e);
    }
  }

  playChime(type = 'radar') {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    if (type === 'radar') {
      // Ascending radar chime
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        setTimeout(() => this.playTone(freq, 'sine', 0.25, 0.2), i * 90);
      });
    } else if (type === 'zen') {
      // Warm meditation bowl
      this.playTone(432, 'triangle', 1.4, 0.3);
      setTimeout(() => this.playTone(864, 'sine', 1.0, 0.1), 50);
    } else {
      // Cyber pulse
      this.playTone(880, 'square', 0.1, 0.15);
      setTimeout(() => this.playTone(1760, 'square', 0.1, 0.15), 120);
    }
  }

  startAlarmRing(toneType = 'radar') {
    this.stopAlarmRing();
    this.playChime(toneType);
    this.alarmInterval = setInterval(() => {
      this.playChime(toneType);
    }, 1400);
  }

  stopAlarmRing() {
    if (this.alarmInterval) {
      clearInterval(this.alarmInterval);
      this.alarmInterval = null;
    }
  }

  // Synthesize Ambient Sounds (Rain, Brown, White, Zen)
  playAmbient(type = 'rain') {
    this.init();
    if (!this.ctx) return;
    this.stopAmbient();

    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);

    if (type === 'white') {
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
    } else if (type === 'brown' || type === 'rain') {
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5;
      }
    }

    if (type === 'zen') {
      // Continuous drone
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.frequency.setValueAtTime(108, this.ctx.currentTime); // Deep A2
      osc2.frequency.setValueAtTime(162, this.ctx.currentTime); // E3 fifth
      gain.gain.setValueAtTime(this.isMuted ? 0 : 0.2, this.ctx.currentTime);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start();
      osc2.start();

      this.ambientSource = {
        stop: () => {
          try {
            osc1.stop();
            osc2.stop();
          } catch(e){}
        }
      };
      this.ambientGain = gain;
      this.currentAmbient = type;
      return;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;
    whiteNoise.loop = true;

    // Filter to shape into rain or deep rumble
    const filter = this.ctx.createBiquadFilter();
    if (type === 'rain') {
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, this.ctx.currentTime);
    } else if (type === 'brown') {
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(350, this.ctx.currentTime);
    } else {
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3000, this.ctx.currentTime);
    }

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(this.isMuted ? 0 : 0.25, this.ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    whiteNoise.start();
    this.ambientSource = whiteNoise;
    this.ambientGain = gainNode;
    this.currentAmbient = type;
  }

  stopAmbient() {
    if (this.ambientSource) {
      try {
        this.ambientSource.stop();
      } catch (e) {}
      this.ambientSource = null;
      this.ambientGain = null;
      this.currentAmbient = null;
    }
  }
}

const audio = new SoundEngine();

// ============================================================================
// 2. APPLICATION STATE & STORAGE
// ============================================================================
const AppState = {
  currentTab: 'screen-clock',
  clockMode: 'analog', // 'analog' or 'digital'
  deviceMode: 'iphone',
  theme: 'midnight',
  isLandscape: false,

  // World Clock
  worldCities: [
    { name: 'London', tz: 'Europe/London', country: 'United Kingdom' },
    { name: 'New York', tz: 'America/New_York', country: 'United States' },
    { name: 'Tokyo', tz: 'Asia/Tokyo', country: 'Japan' },
    { name: 'Dubai', tz: 'Asia/Dubai', country: 'United Arab Emirates' },
    { name: 'Sydney', tz: 'Australia/Sydney', country: 'Australia' }
  ],

  // Alarms
  alarms: [
    { id: 1, time: '07:30', label: 'Morning Motivation', tone: 'radar', active: true, days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
    { id: 2, time: '09:00', label: 'Standup Sync', tone: 'pulse', active: true, days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
    { id: 3, time: '13:00', label: 'Lunch & Recharge', tone: 'zen', active: false, days: ['Every day'] }
  ],

  // Stopwatch
  stopwatch: {
    isRunning: false,
    startTime: 0,
    elapsed: 0,
    timerId: null,
    laps: []
  },

  // Timer
  timer: {
    totalDuration: 300, // 5 min
    remaining: 300,
    isRunning: false,
    timerId: null
  },

  // Ambient sound state
  ambientSound: 'rain',
  isAmbientPlaying: false
};

// ============================================================================
// 3. CLOCK CORE ENGINE (Continuous 60FPS Sweep + Digital Update)
// ============================================================================
const DialUtils = {
  initTicks() {
    const ticksContainer = document.getElementById('dialTicks');
    if (!ticksContainer) return;
    ticksContainer.innerHTML = '';

    for (let i = 1; i <= 12; i++) {
      const angle = i * 30;
      // Mark line
      const mark = document.createElement('div');
      mark.className = `dial-mark ${i % 3 === 0 ? 'major' : ''}`;
      mark.style.transform = `rotate(${angle}deg)`;
      ticksContainer.appendChild(mark);

      // Number
      const num = document.createElement('div');
      num.className = 'dial-number';
      num.textContent = i;
      // Counter-rotate the text so numbers stay upright
      num.style.transform = `rotate(${angle}deg) translateY(0px) rotate(-${angle}deg)`;
      ticksContainer.appendChild(num);
    }
  }
};

function updateClock() {
  const now = new Date();
  const ms = now.getMilliseconds();
  const sec = now.getSeconds();
  const min = now.getMinutes();
  const hr = now.getHours();

  // Analog Hands continuous angle
  const secDeg = (sec + ms / 1000) * 6;
  const minDeg = (min + sec / 60) * 6;
  const hrDeg = ((hr % 12) + min / 60) * 30;

  const secHand = document.getElementById('secondHand');
  const minHand = document.getElementById('minuteHand');
  const hrHand = document.getElementById('hourHand');

  if (secHand) secHand.style.transform = `rotate(${secDeg}deg)`;
  if (minHand) minHand.style.transform = `rotate(${minDeg}deg)`;
  if (hrHand) hrHand.style.transform = `rotate(${hrDeg}deg)`;

  // Digital Displays
  const hours12 = hr % 12 || 12;
  const period = hr >= 12 ? 'PM' : 'AM';
  const pad = (n) => String(n).padStart(2, '0');

  const digHours = document.getElementById('digHours');
  const digMinutes = document.getElementById('digMinutes');
  const digSeconds = document.getElementById('digSeconds');
  const digPeriod = document.getElementById('digPeriod');
  const statusClock = document.getElementById('statusClock');

  if (digHours) digHours.textContent = pad(hours12);
  if (digMinutes) digMinutes.textContent = pad(min);
  if (digSeconds) digSeconds.textContent = pad(sec);
  if (digPeriod) digPeriod.textContent = period;
  if (statusClock) statusClock.textContent = `${pad(hours12)}:${pad(min)}`;

  // Date String
  const options = { weekday: 'long', month: 'long', day: 'numeric' };
  const dateStr = now.toLocaleDateString(undefined, options);
  const digDateString = document.getElementById('digDateString');
  if (digDateString) digDateString.textContent = dateStr;

  // Complication Window
  const monthAbbr = now.toLocaleString('default', { month: 'short' }).toUpperCase();
  const dialDateComplication = document.getElementById('dialDateComplication');
  if (dialDateComplication) dialDateComplication.textContent = `${monthAbbr} ${now.getDate()}`;

  requestAnimationFrame(updateClock);
}

// ============================================================================
// 4. WORLD CLOCK MANAGER
// ============================================================================
const availableWorldCities = [
  { name: 'Tokyo', tz: 'Asia/Tokyo', country: 'Japan' },
  { name: 'London', tz: 'Europe/London', country: 'United Kingdom' },
  { name: 'New York', tz: 'America/New_York', country: 'United States' },
  { name: 'Paris', tz: 'Europe/Paris', country: 'France' },
  { name: 'Dubai', tz: 'Asia/Dubai', country: 'United Arab Emirates' },
  { name: 'Sydney', tz: 'Australia/Sydney', country: 'Australia' },
  { name: 'Singapore', tz: 'Asia/Singapore', country: 'Singapore' },
  { name: 'Hong Kong', tz: 'Asia/Hong_Kong', country: 'Hong Kong' },
  { name: 'Los Angeles', tz: 'America/Los_Angeles', country: 'United States' },
  { name: 'Berlin', tz: 'Europe/Berlin', country: 'Germany' },
  { name: 'Toronto', tz: 'America/Toronto', country: 'Canada' },
  { name: 'San Francisco', tz: 'America/Los_Angeles', country: 'United States' },
  { name: 'Mumbai', tz: 'Asia/Kolkata', country: 'India' }
];

function renderWorldClocks() {
  const container = document.getElementById('worldClockList');
  if (!container) return;

  const now = new Date();
  container.innerHTML = '';

  AppState.worldCities.forEach((city, index) => {
    try {
      const cityTimeStr = new Intl.DateTimeFormat('en-US', {
        timeZone: city.tz,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).format(now);

      // Calculate time difference
      const cityDate = new Date(now.toLocaleString('en-US', { timeZone: city.tz }));
      const diffHours = Math.round((cityDate.getTime() - now.getTime()) / (1000 * 60 * 60));
      const diffStr = diffHours === 0 ? 'Same time' : (diffHours > 0 ? `+${diffHours} hrs` : `${diffHours} hrs`);

      const item = document.createElement('div');
      item.className = 'world-clock-item';
      item.innerHTML = `
        <div class="city-info">
          <h4>${city.name}</h4>
          <p>${city.country} · ${diffStr}</p>
        </div>
        <div class="city-time-wrap">
          <div class="city-time">${cityTimeStr}</div>
          <button style="background:none;border:none;color:var(--text-muted);font-size:11px;cursor:pointer;" onclick="deleteCity(${index})">Remove</button>
        </div>
      `;
      container.appendChild(item);
    } catch (e) {
      console.warn(`Timezone render issue for ${city.tz}`, e);
    }
  });
}

window.deleteCity = function(index) {
  AppState.worldCities.splice(index, 1);
  renderWorldClocks();
};

function renderAvailableCitiesModal() {
  const list = document.getElementById('availableCitiesList');
  if (!list) return;
  list.innerHTML = '';

  availableWorldCities.forEach(city => {
    const isAdded = AppState.worldCities.some(c => c.name === city.name);
    const item = document.createElement('div');
    item.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:var(--surface-2); border-radius:10px;';
    item.innerHTML = `
      <div>
        <div style="font-weight:600; font-size:14px;">${city.name}</div>
        <div style="font-size:11px; color:var(--text-muted);">${city.country}</div>
      </div>
      <button class="tool-action-btn" style="padding:4px 10px; font-size:11px;" ${isAdded ? 'disabled' : ''}>
        ${isAdded ? 'Added' : '+ Add'}
      </button>
    `;
    item.querySelector('button').addEventListener('click', () => {
      if (!isAdded) {
        AppState.worldCities.push(city);
        renderWorldClocks();
        document.getElementById('addCityModal').classList.remove('active');
      }
    });
    list.appendChild(item);
  });
}

// ============================================================================
// 5. ALARM SYSTEM & SCHEDULING
// ============================================================================
function renderAlarms() {
  const container = document.getElementById('alarmListContainer');
  if (!container) return;
  container.innerHTML = '';

  AppState.alarms.forEach(alarm => {
    const card = document.createElement('div');
    card.className = `alarm-card ${alarm.active ? '' : 'inactive'}`;
    card.innerHTML = `
      <div class="alarm-time-wrap">
        <div class="alarm-time">${alarm.time}</div>
        <div class="alarm-label">${alarm.label}</div>
        <div class="alarm-days">
          ${alarm.days.map(d => `<span class="day-chip active">${d}</span>`).join('')}
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 12px;">
        <label class="switch">
          <input type="checkbox" ${alarm.active ? 'checked' : ''} data-id="${alarm.id}">
          <span class="slider"></span>
        </label>
        <button style="background:none;border:none;color:var(--text-muted);font-size:14px;cursor:pointer;" onclick="deleteAlarm(${alarm.id})" title="Delete Alarm">🗑️</button>
      </div>
    `;

    card.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
      alarm.active = e.target.checked;
      card.classList.toggle('inactive', !alarm.active);
      updateNextAlarmBanner();
    });

    container.appendChild(card);
  });

  updateNextAlarmBanner();
}

window.deleteAlarm = function(id) {
  AppState.alarms = AppState.alarms.filter(a => a.id !== id);
  renderAlarms();
};

function updateNextAlarmBanner() {
  const banner = document.getElementById('nextAlarmCountdown');
  if (!banner) return;

  const activeAlarms = AppState.alarms.filter(a => a.active);
  if (activeAlarms.length === 0) {
    banner.textContent = 'No active alarms';
    return;
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  let closestDiff = Infinity;
  let closestAlarm = null;

  activeAlarms.forEach(alarm => {
    const [h, m] = alarm.time.split(':').map(Number);
    let alarmMinutes = h * 60 + m;
    let diff = alarmMinutes - currentMinutes;
    if (diff <= 0) diff += 24 * 60; // Next day
    if (diff < closestDiff) {
      closestDiff = diff;
      closestAlarm = alarm;
    }
  });

  if (closestAlarm) {
    const hrs = Math.floor(closestDiff / 60);
    const mins = closestDiff % 60;
    const timeStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
    banner.textContent = `In ${timeStr} (${closestAlarm.label} at ${closestAlarm.time})`;
  }
}

// Alarm Trigger Check
let lastAlarmMinute = -1;
function checkAlarms() {
  const now = new Date();
  const currentMinute = now.getHours() * 60 + now.getMinutes();
  if (currentMinute === lastAlarmMinute) return;

  const pad = (n) => String(n).padStart(2, '0');
  const timeNowStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  AppState.alarms.forEach(alarm => {
    if (alarm.active && alarm.time === timeNowStr) {
      triggerAlarm(alarm);
    }
  });

  lastAlarmMinute = currentMinute;
}

function triggerAlarm(alarm) {
  const overlay = document.getElementById('alarmRingOverlay');
  const label = document.getElementById('ringingAlarmLabel');
  const time = document.getElementById('ringingAlarmTime');

  if (overlay) {
    label.textContent = alarm.label;
    time.textContent = alarm.time;
    overlay.classList.add('active');
  }

  audio.startAlarmRing(alarm.tone || 'radar');
}

function dismissAlarm() {
  const overlay = document.getElementById('alarmRingOverlay');
  if (overlay) overlay.classList.remove('active');
  audio.stopAlarmRing();
}

// ============================================================================
// 6. STOPWATCH (High Precision Chronometer)
// ============================================================================
const StopwatchController = {
  formatTime(totalMs) {
    const mins = Math.floor(totalMs / 60000);
    const secs = Math.floor((totalMs % 60000) / 1000);
    const ms = Math.floor((totalMs % 1000) / 10);
    const pad = (n) => String(n).padStart(2, '0');
    return { mins: pad(mins), secs: pad(secs), ms: pad(ms), formatted: `${pad(mins)}:${pad(secs)}.${pad(ms)}` };
  },

  updateDisplay() {
    const sw = AppState.stopwatch;
    const currentElapsed = sw.isRunning ? (performance.now() - sw.startTime + sw.elapsed) : sw.elapsed;
    const t = this.formatTime(currentElapsed);

    document.getElementById('swMinutes').textContent = t.mins;
    document.getElementById('swSeconds').textContent = t.secs;
    document.getElementById('swMs').textContent = t.ms;

    // SVG Ring 60-second rotation
    const ring = document.getElementById('stopwatchProgressRing');
    if (ring) {
      const secFraction = (currentElapsed % 60000) / 60000;
      const circumference = 691;
      ring.style.strokeDashoffset = circumference * (1 - secFraction);
    }

    // Dynamic Island Preview
    const island = document.getElementById('islandStatusText');
    if (island && sw.isRunning) {
      island.textContent = `${t.mins}:${t.secs}.${t.ms}`;
    }

    if (sw.isRunning) {
      sw.timerId = requestAnimationFrame(() => this.updateDisplay());
    }
  },

  start() {
    const sw = AppState.stopwatch;
    sw.isRunning = true;
    sw.startTime = performance.now();
    audio.playTone(600, 'sine', 0.05, 0.1);

    const btnStart = document.getElementById('btnStartStop');
    const btnLap = document.getElementById('btnLapReset');
    btnStart.textContent = 'Stop';
    btnStart.classList.add('running');
    btnLap.textContent = 'Lap';
    btnLap.disabled = false;

    this.updateDisplay();
  },

  stop() {
    const sw = AppState.stopwatch;
    sw.isRunning = false;
    sw.elapsed += performance.now() - sw.startTime;
    cancelAnimationFrame(sw.timerId);
    audio.playTone(400, 'sine', 0.05, 0.1);

    const btnStart = document.getElementById('btnStartStop');
    const btnLap = document.getElementById('btnLapReset');
    btnStart.textContent = 'Start';
    btnStart.classList.remove('running');
    btnLap.textContent = 'Reset';

    const island = document.getElementById('islandStatusText');
    if (island) island.textContent = 'CHRONOS';
  },

  reset() {
    const sw = AppState.stopwatch;
    sw.isRunning = false;
    sw.elapsed = 0;
    sw.laps = [];
    cancelAnimationFrame(sw.timerId);

    document.getElementById('swMinutes').textContent = '00';
    document.getElementById('swSeconds').textContent = '00';
    document.getElementById('swMs').textContent = '00';
    document.getElementById('stopwatchProgressRing').style.strokeDashoffset = 691;
    document.getElementById('btnLapReset').disabled = true;
    document.getElementById('swCurrentLapPreview').textContent = 'Lap 1 · 00:00.00';
    document.getElementById('lapListWrap').innerHTML = '';
  },

  recordLap() {
    const sw = AppState.stopwatch;
    const currentElapsed = performance.now() - sw.startTime + sw.elapsed;
    const previousLapTotal = sw.laps.reduce((acc, lap) => acc + lap.splitMs, 0);
    const splitMs = currentElapsed - previousLapTotal;

    const lapObj = {
      index: sw.laps.length + 1,
      splitMs: splitMs,
      totalMs: currentElapsed,
      splitFormatted: this.formatTime(splitMs).formatted,
      totalFormatted: this.formatTime(currentElapsed).formatted
    };

    sw.laps.unshift(lapObj);
    audio.playTone(800, 'sine', 0.04, 0.1);
    this.renderLaps();
  },

  renderLaps() {
    const container = document.getElementById('lapListWrap');
    if (!container) return;
    const laps = AppState.stopwatch.laps;
    container.innerHTML = '';

    let minSplit = Infinity;
    let maxSplit = -Infinity;

    if (laps.length >= 2) {
      laps.forEach(l => {
        if (l.splitMs < minSplit) minSplit = l.splitMs;
        if (l.splitMs > maxSplit) maxSplit = l.splitMs;
      });
    }

    laps.forEach(lap => {
      const row = document.createElement('div');
      let lapClass = '';
      if (laps.length >= 2) {
        if (lap.splitMs === minSplit) lapClass = 'best-lap';
        else if (lap.splitMs === maxSplit) lapClass = 'worst-lap';
      }

      row.className = `lap-row ${lapClass}`;
      row.innerHTML = `
        <span>Lap ${String(lap.index).padStart(2, '0')}</span>
        <span>${lap.splitFormatted}</span>
        <span style="color:var(--text-muted);">${lap.totalFormatted}</span>
      `;
      container.appendChild(row);
    });

    const preview = document.getElementById('swCurrentLapPreview');
    if (preview) {
      preview.textContent = `Lap ${laps.length + 1}`;
    }
  }
};

// ============================================================================
// 7. TIMER (Radial Countdown & Presets)
// ============================================================================
const TimerController = {
  formatSeconds(secs) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  },

  updateDisplay() {
    const tm = AppState.timer;
    const display = document.getElementById('timerDisplay');
    const ring = document.getElementById('timerProgressRing');
    const status = document.getElementById('timerStatusBadge');

    if (display) display.textContent = this.formatSeconds(tm.remaining);

    if (ring) {
      const fraction = tm.remaining / tm.totalDuration;
      const circumference = 691;
      ring.style.strokeDashoffset = circumference * (1 - fraction);
    }

    if (status) {
      status.textContent = tm.isRunning ? 'Active Countdown' : (tm.remaining < tm.totalDuration ? 'Paused' : 'Ready');
    }

    const island = document.getElementById('islandStatusText');
    if (island && tm.isRunning) {
      island.textContent = `⏳ ${this.formatSeconds(tm.remaining)}`;
    }
  },

  start() {
    const tm = AppState.timer;
    if (tm.remaining <= 0) {
      const h = parseInt(document.getElementById('inputTimerHours').value) || 0;
      const m = parseInt(document.getElementById('inputTimerMinutes').value) || 0;
      const s = parseInt(document.getElementById('inputTimerSeconds').value) || 0;
      tm.totalDuration = h * 3600 + m * 60 + s;
      tm.remaining = tm.totalDuration;
    }

    if (tm.totalDuration <= 0) return;

    tm.isRunning = true;
    audio.playTone(700, 'sine', 0.1, 0.15);

    document.getElementById('btnTimerStart').textContent = 'Pause';
    document.getElementById('btnTimerCancel').disabled = false;
    document.getElementById('btnTimerAddMinute').style.display = 'inline-flex';
    document.getElementById('timerPickerWrap').style.display = 'none';

    clearInterval(tm.timerId);
    tm.timerId = setInterval(() => {
      tm.remaining--;
      this.updateDisplay();

      if (tm.remaining <= 0) {
        this.completed();
      }
    }, 1000);

    this.updateDisplay();
  },

  pause() {
    const tm = AppState.timer;
    tm.isRunning = false;
    clearInterval(tm.timerId);
    document.getElementById('btnTimerStart').textContent = 'Resume';
    this.updateDisplay();
  },

  cancel() {
    const tm = AppState.timer;
    tm.isRunning = false;
    clearInterval(tm.timerId);
    tm.remaining = tm.totalDuration;

    document.getElementById('btnTimerStart').textContent = 'Start Timer';
    document.getElementById('btnTimerCancel').disabled = true;
    document.getElementById('btnTimerAddMinute').style.display = 'none';
    document.getElementById('timerPickerWrap').style.display = 'flex';

    const island = document.getElementById('islandStatusText');
    if (island) island.textContent = 'CHRONOS';

    this.updateDisplay();
  },

  addMinute() {
    const tm = AppState.timer;
    tm.remaining += 60;
    tm.totalDuration += 60;
    audio.playTone(850, 'sine', 0.08, 0.1);
    this.updateDisplay();
  },

  completed() {
    this.cancel();
    audio.playChime('radar');
    alert('⏱️ Timer Finished!');
  },

  setPreset(seconds) {
    const tm = AppState.timer;
    if (tm.isRunning) this.cancel();
    tm.totalDuration = seconds;
    tm.remaining = seconds;

    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    document.getElementById('inputTimerHours').value = String(h).padStart(2, '0');
    document.getElementById('inputTimerMinutes').value = String(m).padStart(2, '0');
    document.getElementById('inputTimerSeconds').value = String(s).padStart(2, '0');

    this.updateDisplay();
  }
};

// ============================================================================
// 8. SLEEP CYCLE CALCULATOR & AMBIENT MACHINE
// ============================================================================
function updateSleepCycles() {
  const container = document.getElementById('cycleGrid');
  if (!container) return;
  container.innerHTML = '';

  const now = new Date();
  // Standard 14 mins to fall asleep
  const fallAsleepTime = new Date(now.getTime() + 14 * 60 * 1000);

  // 3 to 6 cycles (90 min each)
  const cycles = [
    { count: 3, label: '4.5 hrs (Power)' },
    { count: 4, label: '6 hrs (Good)' },
    { count: 5, label: '7.5 hrs (Optimal)', suggested: true },
    { count: 6, label: '9 hrs (Deep Rest)' }
  ];

  cycles.forEach(c => {
    const wakeTime = new Date(fallAsleepTime.getTime() + c.count * 90 * 60 * 1000);
    const timeStr = wakeTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    const card = document.createElement('div');
    card.className = `cycle-card ${c.suggested ? 'suggested' : ''}`;
    card.innerHTML = `
      <div class="cycle-time">${timeStr}</div>
      <div class="cycle-count">${c.count} Cycles</div>
      <div style="font-size:10px;color:var(--text-muted);">${c.label}</div>
    `;
    card.addEventListener('click', () => {
      // Quick set alarm
      const pad = (n) => String(n).padStart(2, '0');
      const h = pad(wakeTime.getHours());
      const m = pad(wakeTime.getMinutes());
      AppState.alarms.push({
        id: Date.now(),
        time: `${h}:${m}`,
        label: `Sleep Cycle Alarm (${c.count} cycles)`,
        tone: 'zen',
        active: true,
        days: ['Today']
      });
      renderAlarms();
      alert(`⏰ Alarm set for ${timeStr} (${c.label})`);
    });
    container.appendChild(card);
  });
}

function setupSoundMachine() {
  const soundChips = document.querySelectorAll('.sound-chip');
  const btnToggle = document.getElementById('btnToggleSoundMachine');
  const viz = document.getElementById('audioBarsViz');
  const playText = document.getElementById('soundPlayText');
  const playIcon = document.getElementById('soundPlayIcon');

  soundChips.forEach(chip => {
    chip.addEventListener('click', () => {
      soundChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      AppState.ambientSound = chip.dataset.sound;
      if (AppState.isAmbientPlaying) {
        audio.playAmbient(AppState.ambientSound);
      }
    });
  });

  if (btnToggle) {
    btnToggle.addEventListener('click', () => {
      AppState.isAmbientPlaying = !AppState.isAmbientPlaying;
      if (AppState.isAmbientPlaying) {
        audio.playAmbient(AppState.ambientSound);
        viz.classList.add('playing');
        playText.textContent = 'Pause Soundscape';
        playIcon.textContent = '⏸';
      } else {
        audio.stopAmbient();
        viz.classList.remove('playing');
        playText.textContent = 'Play Soundscape';
        playIcon.textContent = '▶';
      }
    });
  }
}

// ============================================================================
// 9. EMULATOR HARDWARE & WORKSPACE CONTROLS
// ============================================================================
function setupEmulatorControls() {
  const deviceShell = document.getElementById('deviceShell');

  // Device Chassis Buttons
  document.querySelectorAll('.device-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.device-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const device = btn.dataset.device;
      AppState.deviceMode = device;

      deviceShell.className = `device-shell mode-${device} ${AppState.isLandscape ? 'orientation-landscape' : ''}`;
    });
  });

  // Rotate Device
  const btnRotate = document.getElementById('btnRotateDevice');
  if (btnRotate) {
    btnRotate.addEventListener('click', () => {
      AppState.isLandscape = !AppState.isLandscape;
      deviceShell.classList.toggle('orientation-landscape', AppState.isLandscape);
    });
  }

  // Audio Mute Toggle
  const btnSound = document.getElementById('btnSoundToggle');
  const soundIcon = document.getElementById('soundIcon');
  if (btnSound) {
    btnSound.addEventListener('click', () => {
      const isAudible = audio.toggleMute();
      soundIcon.textContent = isAudible ? '🔊' : '🔇';
    });
  }

  // Theme Switcher
  const themeSelect = document.getElementById('themeSelect');
  if (themeSelect) {
    themeSelect.addEventListener('change', (e) => {
      document.body.setAttribute('data-theme', e.target.value);
    });
  }

  // Dynamic Island Expansion
  const island = document.getElementById('dynamicIsland');
  if (island) {
    island.addEventListener('click', () => {
      island.classList.toggle('expanded');
    });
  }
}

// ============================================================================
// 10. SCREEN ROUTING & NAVIGATION
// ============================================================================
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const screens = document.querySelectorAll('.app-screen');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetId = item.dataset.target;
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      screens.forEach(screen => {
        screen.classList.remove('active');
        if (screen.id === targetId) {
          screen.classList.add('active');
        }
      });

      AppState.currentTab = targetId;

      if (targetId === 'screen-sleep') {
        updateSleepCycles();
      }
    });
  });

  // Analog / Digital View Toggle
  const toggleAnalog = document.getElementById('toggleAnalogBtn');
  const toggleDigital = document.getElementById('toggleDigitalBtn');
  const analogWrap = document.getElementById('analogClockWrap');
  const digitalCard = document.getElementById('digitalClockCard');

  toggleAnalog.addEventListener('click', () => {
    toggleAnalog.classList.add('active');
    toggleDigital.classList.remove('active');
    analogWrap.style.display = 'flex';
  });

  toggleDigital.addEventListener('click', () => {
    toggleDigital.classList.add('active');
    toggleAnalog.classList.remove('active');
    analogWrap.style.display = 'none';
  });
}

// ============================================================================
// 11. MODAL HANDLERS
// ============================================================================
function setupModals() {
  // Add Alarm Modal
  const btnOpenAlarm = document.getElementById('btnOpenNewAlarm');
  const alarmModal = document.getElementById('addAlarmModal');
  const btnCloseAlarm = document.getElementById('btnCloseAlarmModal');
  const btnSaveAlarm = document.getElementById('btnSaveAlarm');

  if (btnOpenAlarm) btnOpenAlarm.addEventListener('click', () => alarmModal.classList.add('active'));
  if (btnCloseAlarm) btnCloseAlarm.addEventListener('click', () => alarmModal.classList.remove('active'));

  if (btnSaveAlarm) {
    btnSaveAlarm.addEventListener('click', () => {
      const h = String(document.getElementById('alarmInputHours').value).padStart(2, '0');
      const m = String(document.getElementById('alarmInputMins').value).padStart(2, '0');
      const label = document.getElementById('alarmInputLabel').value || 'Alarm';
      const tone = document.getElementById('alarmToneSelect').value || 'radar';

      AppState.alarms.push({
        id: Date.now(),
        time: `${h}:${m}`,
        label: label,
        tone: tone,
        active: true,
        days: ['Daily']
      });

      renderAlarms();
      alarmModal.classList.remove('active');
      audio.playTone(800, 'sine', 0.1, 0.15);
    });
  }

  // Add City Modal
  const btnOpenCity = document.getElementById('btnAddCityBtn');
  const cityModal = document.getElementById('addCityModal');
  const btnCloseCity = document.getElementById('btnCloseCityModal');

  if (btnOpenCity) {
    btnOpenCity.addEventListener('click', () => {
      renderAvailableCitiesModal();
      cityModal.classList.add('active');
    });
  }
  if (btnCloseCity) btnCloseCity.addEventListener('click', () => cityModal.classList.remove('active'));

  // Alarm Ringing Overlay Actions
  const btnSnooze = document.getElementById('btnAlarmSnooze');
  const btnDismiss = document.getElementById('btnAlarmDismiss');

  if (btnSnooze) {
    btnSnooze.addEventListener('click', () => {
      dismissAlarm();
      // Add snooze alarm in 5 minutes
      const now = new Date(Date.now() + 5 * 60 * 1000);
      const pad = (n) => String(n).padStart(2, '0');
      AppState.alarms.push({
        id: Date.now(),
        time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
        label: 'Snoozed Alarm',
        tone: 'radar',
        active: true,
        days: ['Today']
      });
      renderAlarms();
    });
  }

  if (btnDismiss) {
    btnDismiss.addEventListener('click', () => {
      dismissAlarm();
    });
  }
}

// ============================================================================
// 12. INITIALIZATION
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  DialUtils.initTicks();
  updateClock();
  renderWorldClocks();
  setInterval(renderWorldClocks, 10000); // refresh city times every 10s
  setInterval(checkAlarms, 1000); // check alarm triggers every 1s

  renderAlarms();
  setupNavigation();
  setupModals();
  setupEmulatorControls();
  setupSoundMachine();

  // Stopwatch Events
  const btnStartStop = document.getElementById('btnStartStop');
  const btnLapReset = document.getElementById('btnLapReset');
  btnStartStop.addEventListener('click', () => {
    if (AppState.stopwatch.isRunning) StopwatchController.stop();
    else StopwatchController.start();
  });
  btnLapReset.addEventListener('click', () => {
    if (AppState.stopwatch.isRunning) StopwatchController.recordLap();
    else StopwatchController.reset();
  });

  // Timer Events
  const btnTimerStart = document.getElementById('btnTimerStart');
  const btnTimerCancel = document.getElementById('btnTimerCancel');
  const btnTimerAddMinute = document.getElementById('btnTimerAddMinute');

  btnTimerStart.addEventListener('click', () => {
    if (AppState.timer.isRunning) TimerController.pause();
    else TimerController.start();
  });
  btnTimerCancel.addEventListener('click', () => TimerController.cancel());
  btnTimerAddMinute.addEventListener('click', () => TimerController.addMinute());

  document.querySelectorAll('.preset-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const secs = parseInt(chip.dataset.seconds);
      TimerController.setPreset(secs);
    });
  });

  // Local Timezone badge
  const tzBadge = document.getElementById('localTimezoneBadge');
  if (tzBadge) {
    try {
      const tzName = Intl.DateTimeFormat().resolvedOptions().timeZone;
      tzBadge.innerHTML = `<span>📍 Local: ${tzName}</span>`;
    } catch (e) {}
  }
});
