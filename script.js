'use strict';

/* ============================================================
   ЭХО ЭЙРЫ: ВЕЛИКИЙ ЗАМЫСЕЛ — игровая логика v2 (Vanilla JS)
   ============================================================ */

/* ============================================================
   1. CANVAS: фоновая звёздная пыль + сноп искр при клике
   ============================================================ */
const canvas = document.getElementById('bg');
const ctx = canvas.getContext('2d');
let W = 0;
let H = 0;
let dust = [];
let sparks = [];

function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initDust();
}

function initDust() {
    dust = [];
    const count = Math.min(260, Math.floor((W * H) / 9000));
    for (let i = 0; i < count; i++) {
        const gold = Math.random() < 0.5;
        dust.push({
            x: Math.random() * W,
            y: Math.random() * H,
            vx: (Math.random() - 0.5) * 0.18,
            vy: (Math.random() - 0.5) * 0.18,
            r: Math.random() * 1.5 + 0.4,
            a: Math.random() * 0.35 + 0.08,
            tw: Math.random() * Math.PI * 2,
            c: gold ? [212, 175, 106] : [122, 134, 205],
        });
    }
}

function spawnClickSparks() {
    const btn = document.getElementById('healBtn');
    const r = btn.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const count = 46;
    for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const sp = Math.random() * 6.5 + 2.2;
        sparks.push({
            x: cx,
            y: cy,
            vx: Math.cos(ang) * sp,
            vy: Math.sin(ang) * sp,
            life: 1,
            decay: Math.random() * 0.022 + 0.012,
            r: Math.random() * 2.6 + 0.8,
            c: Math.random() < 0.15 ? [255, 243, 214] : [212, 175, 106],
        });
    }
}

function draw() {
    ctx.clearRect(0, 0, W, H);

    // Звёздная пыль (тусклая, медленно дрейфует)
    for (const p of dust) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -12) p.x = W + 12;
        else if (p.x > W + 12) p.x = -12;
        if (p.y < -12) p.y = H + 12;
        else if (p.y > H + 12) p.y = -12;

        p.tw += 0.02;
        const alpha = p.a * (0.55 + 0.45 * Math.sin(p.tw));
        ctx.fillStyle = 'rgba(' + p.c[0] + ',' + p.c[1] + ',' + p.c[2] + ',' + alpha.toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
    }

    // Искры при клике (яркие, затухающие)
    if (sparks.length) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = sparks.length - 1; i >= 0; i--) {
            const s = sparks[i];
            s.x += s.vx;
            s.y += s.vy;
            s.vx *= 0.96;
            s.vy *= 0.96;
            s.vy += 0.02; // лёгкая гравитация
            s.life -= s.decay;
            if (s.life <= 0) {
                sparks.splice(i, 1);
                continue;
            }
            ctx.fillStyle = 'rgba(' + s.c[0] + ',' + s.c[1] + ',' + s.c[2] + ',' + Math.max(0, s.life).toFixed(3) + ')';
            ctx.beginPath();
            ctx.arc(s.x, s.y, Math.max(0.2, s.r * s.life), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

/* ============================================================
   2. КОНСТАНТЫ
   ============================================================ */
const FLASH_DURATION = 10000;      // 10 сек действия Вспышки Света
const FLASH_COOLDOWN = 60000;      // 60 сек базовой перезарядки
const SACRIFICE_COOLDOWN = 120000; // 120 сек базовой перезарядки Жертвы
const COMBO_WINDOW = 1500;         // 1.5 сек окно комбо
const COMBO_MAX = 10;              // максимальный множитель комбо
const VESSEL_CAPACITY = 1000;      // Сосуд Света заполняется до 1000
const VESSEL_CLICK_GAIN = 0.5;     // заполнение за обычный клик
const VESSEL_CRIT_GAIN = 2;        // заполнение за крит
const VESSEL_BONUS_MULT = 500;     // множитель бонуса Вспышки
const PRESTIGE_THRESHOLD = 1000;   // порог престижа
const OFFLINE_CAP_MS = 4 * 3600 * 1000; // офлайн-прогресс не более 4 часов

/* ============================================================
   3. КОНФИГУРАЦИЯ (улучшения, артефакты, квесты, достижения)
   ============================================================ */
const UPGRADES = {
    goldenThread: {
        name: 'Золотая Нить',
        desc: '+1 к силе клика',
        base: 25,
        tab: 'click',
    },
    shadowDagger: {
        name: 'Кинжал Теней',
        desc: 'Множитель клика x1.15 за уровень',
        base: 500,
        tab: 'click',
    },
    bloodRitual: {
        name: 'Кровавый Ритуал',
        desc: '+1% к шансу крита',
        base: 10000,
        tab: 'click',
    },
    foxSpirit: {
        name: 'Дух Лисёнка',
        desc: '+1 душа в секунду',
        base: 50,
        tab: 'auto',
    },
    vesselMirror: {
        name: 'Зеркало Сосуда',
        desc: '+5 душ в секунду',
        base: 500,
        tab: 'auto',
    },
    acceleration: {
        name: 'Ускорение',
        desc: 'КД всех заклинаний -2%',
        base: 25000,
        tab: 'magic',
    },
};

const ARTIFACTS = {
    eyeKeeper: {
        name: 'Око Хранителя',
        icon: '👁️',
        desc: 'Перезарядка магии на 20% быстрее',
        cost: { type: 'echo', amount: 100 },
    },
    witchTear: {
        name: 'Слеза Ведьмы',
        icon: '💧',
        desc: 'Авто-доход +50% душ',
        cost: { type: 'souls', amount: 50000 },
    },
    brokenMirror: {
        name: 'Разбитое Зеркало',
        icon: '🪞',
        desc: 'Шанс крита +10%',
        cost: { type: 'souls', amount: 1000000 },
    },
    cursedBlood: {
        name: 'Проклятая Кровь',
        icon: '🩸',
        desc: 'Урон крита +2x, но сила клика -10%',
        cost: { type: 'souls', amount: 5000000 },
    },
};

// Цепочка квестов: идут строго по порядку, каждый следующий сложнее
const QUESTS = [
    { name: 'Разогрев', desc: 'Соверши 50 кликов', type: 'click', target: 50, reward: { type: 'souls', amount: 200 } },
    { name: 'Первый сбор', desc: 'Собери 500 душ', type: 'souls', target: 500, reward: { type: 'buff', mult: 2, duration: 30 } },
    { name: 'Вложения', desc: 'Купи 5 улучшений', type: 'buy', target: 5, reward: { type: 'souls', amount: 2000 } },
    { name: 'Быстрые пальцы', desc: 'Соверши 250 кликов', type: 'click', target: 250, reward: { type: 'souls', amount: 5000 } },
    { name: 'Точный удар', desc: 'Нанеси 25 критов', type: 'crit', target: 25, reward: { type: 'buff', mult: 2, duration: 30 } },
    { name: 'Кровавый обряд', desc: 'Активируй Жертву 3 раза', type: 'sacrifice', target: 3, reward: { type: 'souls', amount: 50000 } },
    { name: 'Сокровищница', desc: 'Собери 500 000 душ', type: 'souls', target: 500000, reward: { type: 'buff', mult: 2, duration: 60 } },
    { name: 'Инвестор', desc: 'Купи 15 улучшений', type: 'buy', target: 15, reward: { type: 'souls', amount: 1000000 } },
    { name: 'Свет во тьме', desc: 'Вызови Вспышку Сосуда 10 раз', type: 'flash', target: 10, reward: { type: 'buff', mult: 3, duration: 45 } },
    { name: 'Жнец', desc: 'Нанеси 150 критов', type: 'crit', target: 150, reward: { type: 'souls', amount: 5000000 } },
    { name: 'Перерождение', desc: 'Соверши Престиж', type: 'prestige', target: 1, reward: { type: 'buff', mult: 5, duration: 60 } },
    { name: 'Археолог', desc: 'Купи 2 артефакта', type: 'artifact', target: 2, reward: { type: 'souls', amount: 10000000 } },
    { name: 'Двойная жертва', desc: 'Активируй Жертву 10 раз', type: 'sacrifice', target: 10, reward: { type: 'buff', mult: 5, duration: 60 } },
    { name: 'Океан душ', desc: 'Собери 100 000 000 душ', type: 'souls', target: 100000000, reward: { type: 'souls', amount: 100000000 } },
    { name: 'Трижды рождённый', desc: 'Соверши 3 престижа', type: 'prestige', target: 3, reward: { type: 'souls', amount: 1000000000 } },
];

const ACHIEVEMENTS = [
    { id: 'firstClick', name: 'Первое прикосновение', desc: 'Совершить 1 клик', test: s => s.totalClicks >= 1 },
    { id: 'clicks100', name: 'Сто ударов', desc: 'Совершить 100 кликов', test: s => s.totalClicks >= 100 },
    { id: 'clicks1000', name: 'Тысяча ударов', desc: 'Совершить 1000 кликов', test: s => s.totalClicks >= 1000 },
    { id: 'clicks10000', name: 'Рука Эйры', desc: 'Совершить 10000 кликов', test: s => s.totalClicks >= 10000 },
    { id: 'hundred', name: 'Первая сотня', desc: 'Собрать 100 душ', test: s => s.lifetimeSouls >= 100 },
    { id: 'thousand', name: 'Тысяча душ', desc: 'Собрать 1000 душ', test: s => s.lifetimeSouls >= 1000 },
    { id: 'million', name: 'Миллион душ', desc: 'Собрать 1 000 000 душ', test: s => s.lifetimeSouls >= 1e6 },
    { id: 'billion', name: 'Миллиард душ', desc: 'Собрать 1 000 000 000 душ', test: s => s.lifetimeSouls >= 1e9 },
    { id: 'combo5', name: 'Пять витков', desc: 'Достичь комбо x5', test: s => s.maxCombo >= 5 },
    { id: 'combo10', name: 'Мастер комбо', desc: 'Достичь комбо x10', test: s => s.maxCombo >= 10 },
    { id: 'crits50', name: 'Пятьдесят критов', desc: 'Нанести 50 критических ударов', test: s => s.critCount >= 50 },
    { id: 'crits500', name: 'Кровавая жатва', desc: 'Нанести 500 критических ударов', test: s => s.critCount >= 500 },
    { id: 'upgrades25', name: 'Ученик ремесла', desc: 'Купить 25 улучшений', test: s => s.upgradeCount >= 25 },
    { id: 'upgrades100', name: 'Кузнец душ', desc: 'Купить 100 улучшений', test: s => s.upgradeCount >= 100 },
    { id: 'flash10', name: 'Десять вспышек', desc: 'Вызвать 10 вспышек Сосуда', test: s => s.flashCount >= 10 },
    { id: 'flash50', name: 'Солнце во тьме', desc: 'Вызвать 50 вспышек Сосуда', test: s => s.flashCount >= 50 },
    { id: 'sacrifice10', name: 'Десять жертв', desc: 'Активировать Жертву 10 раз', test: s => s.sacrificeCount >= 10 },
    { id: 'prestige1', name: 'Новый цикл', desc: 'Совершить первый престиж', test: s => s.prestigeCount >= 1 },
    { id: 'prestige5', name: 'Вечный путник', desc: 'Совершить 5 престижей', test: s => s.prestigeCount >= 5 },
    { id: 'artifacts4', name: 'Коллекционер', desc: 'Собрать все 4 артефакта', test: s => s.artifactCount >= 4 },
];

const DEFAULT_ACHIEVEMENTS = {};
ACHIEVEMENTS.forEach(function (a) { DEFAULT_ACHIEVEMENTS[a.id] = false; });

/* ============================================================
   4. СОСТОЯНИЕ
   ============================================================ */
const DEFAULT_STATE = {
    souls: 0,
    lifetimeSouls: 0,
    prestigeRunSouls: 0,
    totalClicks: 0,
    critCount: 0,
    flashCount: 0,
    sacrificeCount: 0,
    upgradeCount: 0,
    artifactCount: 0,
    questCount: 0,
    maxCombo: 1,
    combo: 1,
    lastClickTime: 0,
    vesselProgress: 0,
    upgrades: {
        goldenThread: 0,
        shadowDagger: 0,
        bloodRitual: 0,
        foxSpirit: 0,
        vesselMirror: 0,
        acceleration: 0,
    },
    artifacts: {
        eyeKeeper: false,
        witchTear: false,
        brokenMirror: false,
        cursedBlood: false,
    },
    flashUntil: 0,
    flashCooldownUntil: 0,
    flashCooldownDuration: FLASH_COOLDOWN,
    sacrificeCooldownUntil: 0,
    sacrificeCooldownDuration: SACRIFICE_COOLDOWN,
    witchEcho: 0,
    echoLevel: 0,
    prestigeCount: 0,
    buffMult: 1,
    buffUntil: 0,
    questIndex: 0,
    questProgress: 0,
    questSoulsBase: 0,
    achievements: Object.assign({}, DEFAULT_ACHIEVEMENTS),
    playTimeMs: 0,
    sessionStart: Date.now(),
    lastSave: Date.now(),
};

let state = JSON.parse(JSON.stringify(DEFAULT_STATE));

function mergeState(saved) {
    const s = Object.assign({}, DEFAULT_STATE, saved);
    s.upgrades = Object.assign({}, DEFAULT_STATE.upgrades, saved.upgrades || {});
    s.artifacts = Object.assign({}, DEFAULT_STATE.artifacts, saved.artifacts || {});
    s.achievements = Object.assign({}, DEFAULT_ACHIEVEMENTS, saved.achievements || {});
    return s;
}

/* ============================================================
   5. СОХРАНЕНИЕ / ЗАГРУЗКА (localStorage + офлайн-прогресс)
   ============================================================ */
const SAVE_KEY = 'echo_eira_save_v2';

function save() {
    state.playTimeMs += Date.now() - state.sessionStart;
    state.sessionStart = Date.now();
    state.lastSave = Date.now();
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch (e) {
        /* localStorage недоступен — молча пропускаем */
    }
}

function load() {
    let loaded = false;
    let offlineMs = 0;
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (raw) {
            const s = JSON.parse(raw);
            offlineMs = Math.max(0, Date.now() - (s.lastSave || Date.now()));
            state = mergeState(s);
            loaded = true;
        }
    } catch (e) {
        loaded = false;
    }
    state.sessionStart = Date.now();
    state.lastSave = Date.now();

    if (loaded) {
        if (offlineMs > 30000) {
            const capped = Math.min(offlineMs, OFFLINE_CAP_MS);
            const income = soulsPerSec() * (capped / 1000);
            if (income >= 1) {
                state.souls += income;
                state.lifetimeSouls += income;
                state.prestigeRunSouls += income;
                log('Вас не было ' + formatDuration(capped) + '. Вы собрали ' + formatNum(income) + ' душ.');
            } else {
                log('Сохранение загружено. Продолжаем сбор душ.');
            }
        } else {
            log('Сохранение загружено. Продолжаем сбор душ.');
        }
    }
    return loaded;
}

/* ============================================================
   6. ФОРМАТИРОВАНИЕ
   ============================================================ */
function formatNum(n) {
    n = Math.floor(n);
    if (!isFinite(n)) return '∞';
    if (n < 1000) return String(n);
    const units = ['K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'Ud', 'Dd', 'Td'];
    let u = -1;
    let v = n;
    while (v >= 1000 && u < units.length - 1) {
        v /= 1000;
        u++;
    }
    const digits = v >= 100 ? 0 : v >= 10 ? 1 : 2;
    return v.toFixed(digits) + units[u];
}

function formatTime(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return [h, m, s].map(function (x) { return String(x).padStart(2, '0'); }).join(':');
}

function formatDuration(ms) {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return h + 'ч ' + m + 'м';
    if (m > 0) return m + 'м ' + sec + 'с';
    return sec + 'с';
}

/* ============================================================
   7. МАТЕМАТИКА ДОХОДА
   ============================================================ */
function baseClickPower() {
    let v = (1 + state.upgrades.goldenThread) * Math.pow(1.15, state.upgrades.shadowDagger);
    if (state.artifacts.cursedBlood) v *= 0.9; // Проклятая Кровь: -10% к силе клика
    return v;
}

function autoPower() {
    let v = state.upgrades.foxSpirit + state.upgrades.vesselMirror * 5;
    if (state.artifacts.witchTear) v *= 1.5; // Слеза Ведьмы: +50%
    return v;
}

function globalMult() {
    return 1 + state.echoLevel * 0.1;
}

function soulsPerSec() {
    return autoPower() * globalMult();
}

function critChance() {
    let c = 0.10 + state.upgrades.bloodRitual * 0.01;
    if (state.artifacts.brokenMirror) c += 0.10; // Разбитое Зеркало: +10%
    return Math.min(1, c);
}

function critMult() {
    let m = 5;
    if (state.artifacts.cursedBlood) m += 2; // Проклятая Кровь: +2x к урону крита
    return m;
}

function cooldownMult() {
    let m = 1 - state.upgrades.acceleration * 0.02; // Ускорение: -2% за уровень
    if (state.artifacts.eyeKeeper) m *= 0.8;        // Око Хранителя: -20%
    return Math.max(0.1, m);
}

function upgCost(key) {
    const u = UPGRADES[key];
    return Math.floor(u.base * Math.pow(1.25, state.upgrades[key]));
}

function computeEchoGain() {
    if (state.prestigeRunSouls < PRESTIGE_THRESHOLD) return 0;
    return Math.floor(Math.sqrt(state.prestigeRunSouls / PRESTIGE_THRESHOLD));
}

function computeEchoCost() {
    return Math.max(1, Math.ceil(Math.pow(1.6, state.echoLevel)));
}

/* ============================================================
   8. ХРОНИКИ
   ============================================================ */
const chronicle = [];
const chronicleEl = document.getElementById('chronicle');

function log(text) {
    const t = new Date();
    const hh = String(t.getHours()).padStart(2, '0');
    const mm = String(t.getMinutes()).padStart(2, '0');
    const ss = String(t.getSeconds()).padStart(2, '0');
    chronicle.push({ time: hh + ':' + mm + ':' + ss, text: text });
    if (chronicle.length > 100) chronicle.shift();
    renderChronicle();
}

function renderChronicle() {
    chronicleEl.innerHTML = '';
    for (let i = chronicle.length - 1; i >= 0; i--) {
        const entry = chronicle[i];
        const div = document.createElement('div');
        div.className = 'log-entry';
        const span = document.createElement('span');
        span.className = 'log-time';
        span.textContent = entry.time;
        div.appendChild(span);
        div.appendChild(document.createTextNode(entry.text));
        chronicleEl.appendChild(div);
    }
}

/* ============================================================
   9. ДОСТИЖЕНИЯ
   ============================================================ */
function checkAchievements() {
    ACHIEVEMENTS.forEach(function (a) {
        if (!state.achievements[a.id] && a.test(state)) {
            state.achievements[a.id] = true;
            log('Достижение: «' + a.name + '»');
        }
    });
}

function buildAchievements() {
    const container = document.getElementById('achievementsList');
    ACHIEVEMENTS.forEach(function (a) {
        const div = document.createElement('div');
        div.className = 'achievement';
        div.id = 'ach-' + a.id;
        div.innerHTML =
            '<span class="ach-name">' + a.name + '</span>' +
            '<span class="ach-desc">' + a.desc + '</span>';
        container.appendChild(div);
    });
}

function renderAchievements() {
    ACHIEVEMENTS.forEach(function (a) {
        const el = document.getElementById('ach-' + a.id);
        if (el) el.classList.toggle('unlocked', !!state.achievements[a.id]);
    });
    const unlocked = ACHIEVEMENTS.filter(function (a) { return state.achievements[a.id]; }).length;
    els.achCount.textContent = unlocked + '/' + ACHIEVEMENTS.length;
}

/* ============================================================
   10. ВСПЛЫВАЮЩИЙ ТЕКСТ УРОНА
   ============================================================ */
const floatLayer = document.getElementById('floatLayer');

function spawnFloatingText(value, crit, extraClass) {
    const btn = document.getElementById('healBtn');
    const r = btn.getBoundingClientRect();
    const x = r.left + r.width / 2 + (Math.random() - 0.5) * 90;
    const y = r.top + r.height / 2 - 40;
    const el = document.createElement('div');
    el.className = 'float-text' + (crit ? ' crit' : '') + (extraClass ? ' ' + extraClass : '');
    el.textContent = (crit ? 'КРИТ! +' : '+') + formatNum(value);
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    floatLayer.appendChild(el);
    setTimeout(function () { el.remove(); }, 1300);
}

/* ============================================================
   11. КВЕСТЫ
   ============================================================ */
function questProgress() {
    const q = QUESTS[state.questIndex];
    if (!q) return 0;
    if (q.type === 'souls') return state.lifetimeSouls - state.questSoulsBase;
    return state.questProgress;
}

function questIncrement(type) {
    const q = QUESTS[state.questIndex];
    if (q && q.type === type) state.questProgress++;
}

function rewardText(q) {
    if (q.reward.type === 'souls') {
        const amt = Math.floor(q.reward.amount * Math.pow(2, state.prestigeCount));
        return 'Награда: +' + formatNum(amt) + ' душ';
    }
    return 'Награда: x' + q.reward.mult + ' к клику на ' + q.reward.duration + 'с';
}

function completeQuest() {
    const q = QUESTS[state.questIndex];
    if (!q) return;
    if (q.reward.type === 'souls') {
        const amt = Math.floor(q.reward.amount * Math.pow(2, state.prestigeCount));
        state.souls += amt;
        state.lifetimeSouls += amt;
        state.prestigeRunSouls += amt;
        log('Квест выполнен: «' + q.name + '»! Награда: +' + formatNum(amt) + ' душ.');
    } else {
        state.buffMult = q.reward.mult;
        state.buffUntil = Date.now() + q.reward.duration * 1000;
        log('Квест выполнен: «' + q.name + '»! Бафф: x' + q.reward.mult + ' к клику на ' + q.reward.duration + 'с.');
    }
    state.questCount++;
    state.questIndex++;
    state.questProgress = 0;
    state.questSoulsBase = state.lifetimeSouls;
    checkAchievements();
    renderQuestHistory();
}

function checkQuest() {
    const q = QUESTS[state.questIndex];
    if (!q) return;
    if (questProgress() >= q.target) completeQuest();
}

function renderQuest() {
    const q = QUESTS[state.questIndex];
    if (!q) {
        els.questHeader.textContent = 'Все квесты пройдены';
        els.questFill.style.width = '100%';
        els.questName.textContent = 'Все квесты пройдены';
        els.questDesc.textContent = 'Вы прошли всю цепочку. Эйра склоняется перед вами.';
        els.questProgressText.textContent = '—';
        els.questReward.textContent = 'Награда: —';
        els.questFillBig.style.width = '100%';
        return;
    }
    const prog = questProgress();
    const pct = Math.min(100, prog / q.target * 100);
    els.questHeader.textContent = '#' + (state.questIndex + 1) + ' · ' + q.name + ' · ' + Math.floor(prog) + '/' + formatNum(q.target);
    els.questFill.style.width = pct + '%';
    els.questName.textContent = q.name;
    els.questDesc.textContent = q.desc;
    els.questProgressText.textContent = Math.floor(prog) + ' / ' + formatNum(q.target);
    els.questFillBig.style.width = pct + '%';
    els.questReward.textContent = rewardText(q);
}

function renderQuestHistory() {
    els.questHistory.innerHTML = '';
    for (let i = 0; i < state.questIndex; i++) {
        const div = document.createElement('div');
        div.className = 'quest-done-item';
        div.textContent = '✔ ' + QUESTS[i].name;
        els.questHistory.appendChild(div);
    }
}

/* ============================================================
   12. АРТЕФАКТЫ
   ============================================================ */
const artifactEls = {};

function buildArtifacts() {
    const container = document.getElementById('tab-artifacts');
    Object.keys(ARTIFACTS).forEach(function (id) {
        const a = ARTIFACTS[id];
        const card = document.createElement('div');
        card.className = 'artifact';
        card.id = 'artifact-' + id;
        card.innerHTML =
            '<div class="art-icon">' + a.icon + '</div>' +
            '<div class="art-body">' +
            '<span class="art-name">' + a.name + '</span>' +
            '<span class="art-desc">' + a.desc + '</span>' +
            '</div>' +
            '<button class="art-btn" id="artbtn-' + id + '"></button>';
        container.appendChild(card);
        const btn = card.querySelector('#artbtn-' + id);
        artifactEls[id] = { card: card, btn: btn };
        btn.addEventListener('click', function () { buyArtifact(id); });
    });
}

function renderArtifacts() {
    Object.keys(ARTIFACTS).forEach(function (id) {
        const a = ARTIFACTS[id];
        const e = artifactEls[id];
        const owned = state.artifacts[id];
        e.card.classList.toggle('owned', owned);
        if (owned) {
            e.btn.textContent = 'Куплено';
            e.btn.disabled = true;
        } else {
            const canAfford = a.cost.type === 'echo'
                ? state.witchEcho >= a.cost.amount
                : state.souls >= a.cost.amount;
            e.btn.disabled = !canAfford;
            e.btn.textContent = a.cost.type === 'echo'
                ? a.cost.amount + ' Эха'
                : formatNum(a.cost.amount) + ' душ';
        }
    });
}

function buyArtifact(id) {
    if (state.artifacts[id]) return;
    const a = ARTIFACTS[id];
    if (a.cost.type === 'echo') {
        if (state.witchEcho < a.cost.amount) return;
        state.witchEcho -= a.cost.amount;
    } else {
        if (state.souls < a.cost.amount) return;
        state.souls -= a.cost.amount;
    }
    state.artifacts[id] = true;
    state.artifactCount++;
    log('Артефакт получен: ' + a.icon + ' ' + a.name);
    questIncrement('artifact');
    checkAchievements();
    checkQuest();
    renderUI();
}

/* ============================================================
   13. МАГАЗИН (улучшения)
   ============================================================ */
const upgradeEls = {};

function shopContainerId(tab) {
    if (tab === 'magic') return 'tab-magic-upgrades';
    return 'tab-' + tab;
}

function buildShop() {
    Object.keys(UPGRADES).forEach(function (key) {
        const u = UPGRADES[key];
        const container = document.getElementById(shopContainerId(u.tab));
        const card = document.createElement('div');
        card.className = 'upgrade';
        card.innerHTML =
            '<div class="upg-top">' +
            '<span class="upg-name">' + u.name + '</span>' +
            '<span class="upg-level" id="lv-' + key + '">Ур. 0</span>' +
            '</div>' +
            '<p class="upg-desc">' + u.desc + '</p>' +
            '<button class="buy-btn" id="buy-' + key + '">' +
            '<span class="buy-label">Купить · </span>' +
            '<span class="cost" id="cost-' + key + '">0</span>' +
            '<span class="cost-cur"> душ</span>' +
            '</button>';
        container.appendChild(card);

        const btn = card.querySelector('#buy-' + key);
        upgradeEls[key] = {
            level: card.querySelector('#lv-' + key),
            cost: card.querySelector('#cost-' + key),
            btn: btn,
        };
        btn.addEventListener('click', function () { buyUpgrade(key); });
    });
}

function renderShop() {
    Object.keys(UPGRADES).forEach(function (key) {
        const e = upgradeEls[key];
        const cost = upgCost(key);
        e.level.textContent = 'Ур. ' + state.upgrades[key];
        e.cost.textContent = formatNum(cost);
        e.btn.disabled = state.souls < cost;
    });
}

function buyUpgrade(key) {
    const cost = upgCost(key);
    if (state.souls < cost) return;
    state.souls -= cost;
    state.upgrades[key]++;
    state.upgradeCount++;
    log('Улучшено: ' + UPGRADES[key].name + ' → ур. ' + state.upgrades[key]);
    questIncrement('buy');
    checkAchievements();
    checkQuest();
    renderUI();
}

/* ============================================================
   14. ИГРОВЫЕ ДЕЙСТВИЯ
   ============================================================ */
function onHeal() {
    const now = Date.now();
    state.totalClicks++;

    // Комбо: +0.1 за быстрый клик, окно 1.5 сек
    if (now - state.lastClickTime <= COMBO_WINDOW) {
        state.combo = Math.min(COMBO_MAX, state.combo + 0.1);
    } else {
        state.combo = 1;
    }
    state.lastClickTime = now;
    if (state.combo > state.maxCombo) state.maxCombo = state.combo;

    // Крит
    const crit = Math.random() < critChance();
    if (crit) state.critCount++;

    const flashMult = now < state.flashUntil ? 10 : 1;
    const buffMult = now < state.buffUntil ? state.buffMult : 1;
    let value = baseClickPower() * flashMult * buffMult * state.combo * globalMult();
    if (crit) value *= critMult();
    value = Math.max(1, Math.floor(value));

    state.souls += value;
    state.lifetimeSouls += value;
    state.prestigeRunSouls += value;

    // Сосуд Света: +0.5 за клик, +2 за крит
    state.vesselProgress += crit ? VESSEL_CRIT_GAIN : VESSEL_CLICK_GAIN;
    if (state.vesselProgress >= VESSEL_CAPACITY) vesselFlash();

    questIncrement('click');
    if (crit) questIncrement('crit');

    spawnFloatingText(value, crit);
    spawnClickSparks();
    checkAchievements();
    checkQuest();
    renderUI();
}

function vesselFlash() {
    state.flashCount++;
    const bonus = Math.max(500, Math.floor(baseClickPower() * globalMult() * VESSEL_BONUS_MULT));
    state.souls += bonus;
    state.lifetimeSouls += bonus;
    state.prestigeRunSouls += bonus;
    state.vesselProgress = 0;
    log('Сосуд Света переполнен! Вспышка душ: +' + formatNum(bonus));
    spawnFloatingText(bonus, false, 'vessel');
    questIncrement('flash');
    checkAchievements();
    checkQuest();
}

function useFlash() {
    const now = Date.now();
    if (now < state.flashUntil || now < state.flashCooldownUntil) return;
    state.flashUntil = now + FLASH_DURATION;
    state.flashCooldownDuration = Math.floor(FLASH_COOLDOWN * cooldownMult());
    state.flashCooldownUntil = now + FLASH_DURATION + state.flashCooldownDuration;
    log('Вспышка Света! Сила клика x10 на 10 секунд.');
    renderUI();
}

function useSacrifice() {
    const now = Date.now();
    if (now < state.sacrificeCooldownUntil) return;
    state.sacrificeCount++;
    const gain = Math.max(500, Math.floor((baseClickPower() * 100 + autoPower() * 50) * globalMult()));
    state.souls += gain;
    state.lifetimeSouls += gain;
    state.prestigeRunSouls += gain;
    state.sacrificeCooldownDuration = Math.floor(SACRIFICE_COOLDOWN * cooldownMult());
    state.sacrificeCooldownUntil = now + state.sacrificeCooldownDuration;
    log('Жертва принесена: +' + formatNum(gain) + ' душ.');
    questIncrement('sacrifice');
    checkAchievements();
    checkQuest();
    renderUI();
}

function doPrestige() {
    const gain = computeEchoGain();
    if (gain <= 0) return;
    state.witchEcho += gain;
    state.prestigeCount++;
    state.souls = 0;
    state.prestigeRunSouls = 0;
    state.upgrades = {
        goldenThread: 0, shadowDagger: 0, bloodRitual: 0,
        foxSpirit: 0, vesselMirror: 0, acceleration: 0,
    };
    state.vesselProgress = 0;
    state.combo = 1;
    state.lastClickTime = 0;
    state.flashUntil = 0;
    state.flashCooldownUntil = 0;
    state.sacrificeCooldownUntil = 0;
    state.buffUntil = 0;
    state.buffMult = 1;
    log('Совершён Новый Цикл! Получено Эхо Ведьм: +' + gain);
    questIncrement('prestige');
    checkAchievements();
    checkQuest();
    save();
    renderUI();
}

function buyEcho() {
    const cost = computeEchoCost();
    if (state.witchEcho < cost) return;
    state.witchEcho -= cost;
    state.echoLevel++;
    log('Вечное Эхо вознесено! Глобальный множитель: x' + globalMult().toFixed(1));
    renderUI();
}

/* ============================================================
   15. РЕНДЕР ИНТЕРФЕЙСА
   ============================================================ */
const els = {};

function cacheElements() {
    els.souls = document.getElementById('soulsDisplay');
    els.sps = document.getElementById('spsDisplay');
    els.mult = document.getElementById('multDisplay');
    els.statClicks = document.getElementById('statClicks');
    els.statCrits = document.getElementById('statCrits');
    els.statSouls = document.getElementById('statSouls');
    els.statQuests = document.getElementById('statQuests');
    els.statPrestige = document.getElementById('statPrestige');
    els.statTime = document.getElementById('statTime');
    els.achCount = document.getElementById('achCount');
    els.vesselPct = document.getElementById('vesselPct');
    els.vesselFill = document.getElementById('vesselFill');
    els.buffPanel = document.getElementById('buffPanel');
    els.buffText = document.getElementById('buffText');
    els.buffTime = document.getElementById('buffTime');
    els.questHeader = document.getElementById('questHeader');
    els.questFill = document.getElementById('questFill');
    els.comboPanel = document.getElementById('comboPanel');
    els.comboValue = document.getElementById('comboValue');
    els.comboFill = document.getElementById('comboFill');
    els.comboMeltFill = document.getElementById('comboMeltFill');
    els.clickPower = document.getElementById('clickPowerDisplay');
    els.critChance = document.getElementById('critChanceDisplay');
    els.critMult = document.getElementById('critMultDisplay');
    els.flashBtn = document.getElementById('flashBtn');
    els.flashCd = document.getElementById('flashCd');
    els.flashOverlay = document.getElementById('flashOverlay');
    els.sacrificeBtn = document.getElementById('sacrificeBtn');
    els.sacrificeCd = document.getElementById('sacrificeCd');
    els.sacrificeOverlay = document.getElementById('sacrificeOverlay');
    els.runSouls = document.getElementById('runSouls');
    els.echoGain = document.getElementById('echoGainDisplay');
    els.prestigeBtn = document.getElementById('prestigeBtn');
    els.echoHave = document.getElementById('echoHave');
    els.echoMult = document.getElementById('echoMultDisplay');
    els.echoCost = document.getElementById('echoCostDisplay');
    els.echoBtn = document.getElementById('echoBtn');
    els.questName = document.getElementById('questName');
    els.questDesc = document.getElementById('questDesc');
    els.questProgressText = document.getElementById('questProgressText');
    els.questReward = document.getElementById('questReward');
    els.questFillBig = document.getElementById('questFillBig');
    els.questHistory = document.getElementById('questHistory');
}

function renderMagic(now) {
    // Вспышка Света
    if (now < state.flashUntil) {
        els.flashCd.textContent = 'АКТИВНО ' + Math.ceil((state.flashUntil - now) / 1000) + 'с';
        els.flashBtn.classList.remove('cooldown');
        els.flashBtn.classList.add('active');
        els.flashOverlay.style.height = '0%';
    } else if (now < state.flashCooldownUntil) {
        const left = state.flashCooldownUntil - now;
        els.flashCd.textContent = 'КД ' + Math.ceil(left / 1000) + 'с';
        els.flashBtn.classList.add('cooldown');
        els.flashBtn.classList.remove('active');
        els.flashOverlay.style.height = (left / state.flashCooldownDuration * 100) + '%';
    } else {
        els.flashCd.textContent = 'Готово';
        els.flashBtn.classList.remove('cooldown', 'active');
        els.flashOverlay.style.height = '0%';
    }

    // Жертва
    if (now < state.sacrificeCooldownUntil) {
        const left = state.sacrificeCooldownUntil - now;
        els.sacrificeCd.textContent = 'КД ' + Math.ceil(left / 1000) + 'с';
        els.sacrificeBtn.classList.add('cooldown');
        els.sacrificeOverlay.style.height = (left / state.sacrificeCooldownDuration * 100) + '%';
    } else {
        els.sacrificeCd.textContent = 'Готово';
        els.sacrificeBtn.classList.remove('cooldown');
        els.sacrificeOverlay.style.height = '0%';
    }
}

function renderBuff(now) {
    if (now < state.buffUntil) {
        els.buffPanel.classList.remove('hidden');
        els.buffText.textContent = 'x' + state.buffMult + ' к клику';
        els.buffTime.textContent = Math.ceil((state.buffUntil - now) / 1000) + 'с';
    } else {
        els.buffPanel.classList.add('hidden');
    }
}

function renderUI() {
    const now = Date.now();

    els.souls.textContent = formatNum(state.souls);
    els.sps.textContent = formatNum(soulsPerSec());
    els.mult.textContent = 'x' + globalMult().toFixed(1);

    els.statClicks.textContent = formatNum(state.totalClicks);
    els.statCrits.textContent = formatNum(state.critCount);
    els.statSouls.textContent = formatNum(state.lifetimeSouls);
    els.statQuests.textContent = state.questCount + '/' + QUESTS.length;
    els.statPrestige.textContent = state.prestigeCount;
    els.statTime.textContent = formatTime(state.playTimeMs + (now - state.sessionStart));

    els.clickPower.textContent = formatNum(baseClickPower());
    els.critChance.textContent = Math.round(critChance() * 100) + '%';
    els.critMult.textContent = 'x' + critMult();

    // Сосуд Света
    const vp = Math.min(VESSEL_CAPACITY, state.vesselProgress);
    els.vesselPct.textContent = Math.floor(vp / VESSEL_CAPACITY * 100) + '%';
    els.vesselFill.style.width = (vp / VESSEL_CAPACITY * 100) + '%';

    // Комбо
    const comboActive = (now - state.lastClickTime <= COMBO_WINDOW) || state.combo > 1;
    els.comboPanel.classList.toggle('hidden', !comboActive);
    els.comboValue.textContent = 'x' + state.combo.toFixed(1);
    els.comboFill.style.width = (state.combo / COMBO_MAX * 100) + '%';
    const meltFrac = Math.max(0, Math.min(1, (COMBO_WINDOW - (now - state.lastClickTime)) / COMBO_WINDOW));
    els.comboMeltFill.style.width = (meltFrac * 100) + '%';

    // Бафф, квест, магия
    renderBuff(now);
    renderQuest();
    renderMagic(now);

    // Цикл / Престиж
    const gain = computeEchoGain();
    els.runSouls.textContent = formatNum(state.prestigeRunSouls);
    els.echoGain.textContent = gain;
    els.prestigeBtn.disabled = gain <= 0;
    els.prestigeBtn.classList.toggle('ready', gain > 0);

    els.echoHave.textContent = formatNum(state.witchEcho);
    els.echoMult.textContent = 'x' + globalMult().toFixed(1);
    els.echoCost.textContent = computeEchoCost();
    els.echoBtn.disabled = state.witchEcho < computeEchoCost();

    renderShop();
    renderArtifacts();
    renderAchievements();
}

/* ============================================================
   16. ИГРОВОЙ ЦИКЛ
   ============================================================ */
let lastTs = performance.now();

function updateGame(dt) {
    const now = Date.now();

    // Авто-доход
    const sps = soulsPerSec();
    if (sps > 0) {
        const inc = sps * dt;
        state.souls += inc;
        state.lifetimeSouls += inc;
        state.prestigeRunSouls += inc;
    }

    // Сброс комбо через 1.5 сек без кликов
    if (state.combo > 1 && now - state.lastClickTime > COMBO_WINDOW) {
        state.combo = 1;
    }

    checkAchievements();
    checkQuest();

    // Автосохранение раз в 10 секунд
    if (now - state.lastSave >= 10000) {
        save();
    }
}

function loop(ts) {
    const dt = Math.min(0.1, (ts - lastTs) / 1000 || 0);
    lastTs = ts;
    updateGame(dt);
    draw();
    renderUI();
    requestAnimationFrame(loop);
}

/* ============================================================
   17. СОБЫТИЯ И ИНИЦИАЛИЗАЦИЯ
   ============================================================ */
function bindEvents() {
    document.getElementById('healBtn').addEventListener('click', onHeal);

    document.getElementById('flashBtn').addEventListener('click', useFlash);
    document.getElementById('sacrificeBtn').addEventListener('click', useSacrifice);
    document.getElementById('prestigeBtn').addEventListener('click', doPrestige);
    document.getElementById('echoBtn').addEventListener('click', buyEcho);

    // Переключение вкладок
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
            tabs.forEach(function (t) { t.classList.remove('active'); });
            document.querySelectorAll('.tab-content').forEach(function (c) { c.classList.remove('active'); });
            tab.classList.add('active');
            document.getElementById('tab-' + tab.getAttribute('data-tab')).classList.add('active');
        });
    });

    window.addEventListener('resize', resizeCanvas);

    window.addEventListener('beforeunload', save);
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') save();
    });
}

function init() {
    resizeCanvas();
    cacheElements();
    buildShop();
    buildAchievements();
    buildArtifacts();
    bindEvents();

    const loaded = load();
    if (!loaded) {
        log('Добро пожаловать, целитель душ. Эйра зовёт вас.');
    }

    renderQuestHistory();
    renderUI();
    requestAnimationFrame(loop);
}

init();
