// ============================================================================
// COM PENSEN ELS ROBOTS? — CÀPSULA DIDÀCTICA INTERACTIVA (ÀMBIT TECNOLÒGIC)
// Docent referent: Gerard Calle Reus
// ============================================================================

const APP_STORAGE_KEY = 'robots_flowchart_capsule_state_v1';

let appState = {
    firstName: '',
    lastName: '',
    studentName: '',
    studentGroup: '1r ESO A',
    avatar: '🤖',
    level: 'avancat', // Mode únic avançat
    gameStarted: false,
    currentStage: 1,
    unlockedStage: 1,
    completedStages: [],
    totalXP: 1500,
    penalties: {
        stage1: 0,
        stage2: 0,
        stage3: 0,
        stage4: 0,
        stage5: 0,
        stage6: 0,
        stage7: 0,
        stage8: 0,
        stage9: 0,
        stage10: 0,
        stage11: 0
    },
    stage1Cases: {},
    stage2Sorted: {}, // itemId -> 'action' | 'decision'
    boards: {
        act1: {}, // slotKey -> blockId
        act2: {},
        act3: {},
        act4: {},
        act5: {},
        act6: {}
    },
    boardCleared: {
        act1: false,
        act2: false,
        act3: false,
        act4: false,
        act5: false,
        act6: false
    }
};

const STAGE_TITLES = {
    1: "1.1 Algorismes",
    2: "1.2 Blocs",
    3: "2.1 Despertador",
    4: "2.2 Ocellet",
    5: "2.3 Làmpada",
    6: "2.4 Aspirador",
    7: "2.5 Semàfor",
    8: "2.6 Barrera",
    9: "3.1 Bugs 🐛",
    10: "3.2 Traça 📊",
    11: "3.3 Caixa Negra 📦",
    12: "4.1 Diploma 🎓"
};

// ============================================================================
// PERSISTÈNCIA I GESTIÓ D'ESTAT
// ============================================================================
function loadState() {
    const saved = localStorage.getItem(APP_STORAGE_KEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            appState = Object.assign(appState, parsed);
            if (!appState.penalties) {
                appState.penalties = { stage1: 0, stage2: 0, stage3: 0, stage4: 0, stage5: 0, stage6: 0, stage7: 0, stage8: 0 };
            }
            if (!appState.boards) appState.boards = { act1: {}, act2: {}, act3: {}, act4: {}, act5: {}, act6: {} };
            if (!appState.boardCleared) appState.boardCleared = { act1: false, act2: false, act3: false, act4: false, act5: false, act6: false };
            if (!appState.stage1Cases) appState.stage1Cases = {};
            if (!appState.stage2Sorted) appState.stage2Sorted = {};
            if (!appState.quizAnswers) appState.quizAnswers = {};

            appState.level = 'avancat';
            recalculateXP();
            if (appState.studentName && appState.studentName.trim() !== '') {
                appState.gameStarted = true;
            }
        } catch (e) {
            console.error("Error carregant l'estat:", e);
        }
    }

    updateHeader();
    updateNavigationLocks();

    const hashMatch = window.location.hash.match(/#(?:fase|stage)([1-7])/i);
    if (hashMatch) {
        goToStage(parseInt(hashMatch[1]), true);
    } else if (!appState.studentName) {
        openProfileModal();
    } else {
        goToStage(appState.currentStage || 1);
    }
}

function recalculateXP() {
    const totalDeductions = Object.values(appState.penalties || {}).reduce((acc, v) => acc + (v || 0), 0);
    appState.totalXP = Math.max(0, 1500 - totalDeductions);
}

function saveState() {
    recalculateXP();
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(appState));
    updateHeader();
    updateNavigationLocks();
}

function applyXpPenalty(stageKey, points) {
    if (!appState.penalties) {
        appState.penalties = { stage1: 0, stage2: 0, stage3: 0, stage4: 0, stage5: 0, stage6: 0 };
    }
    appState.penalties[stageKey] = (appState.penalties[stageKey] || 0) + points;
    saveState();

    const xpEl = document.getElementById('header-xp');
    if (xpEl) {
        xpEl.style.color = '#ef4444';
        xpEl.style.transform = 'scale(1.25)';
        setTimeout(() => {
            xpEl.style.color = '';
            xpEl.style.transform = '';
        }, 650);
    }
}

function updateHeader() {
    const av = document.getElementById('header-avatar');
    const nm = document.getElementById('header-name');
    const gr = document.getElementById('header-group');
    const xp = document.getElementById('header-xp');
    const st = document.getElementById('header-unlocked-stage');

    if (av) av.textContent = appState.avatar || '🤖';
    if (nm) nm.textContent = appState.studentName || 'Alumne/a';
    if (gr) gr.textContent = `(${appState.studentGroup || 'ESO'})`;
    if (xp) xp.textContent = appState.totalXP;

    const unlStage = Math.min(12, appState.unlockedStage || 1);
    const stageCode = STAGE_TITLES[unlStage] ? STAGE_TITLES[unlStage].split(' ')[0] : `${unlStage}`;
    if (st) st.textContent = `${stageCode} / 12`;
}

function getModuleForStage(stageNum) {
    if (stageNum <= 2) return 1;
    if (stageNum <= 8) return 2;
    if (stageNum <= 11) return 3;
    return 4;
}

function switchModuleView(modNum) {
    for (let m = 1; m <= 4; m++) {
        const tab = document.getElementById(`mod-tab-${m}`);
        const grp = document.getElementById(`subgroup-mod-${m}`);
        if (tab) tab.classList.toggle('active', m === modNum);
        if (grp) grp.classList.toggle('active', m === modNum);
    }
}

function handleModuleClick(event, modNum) {
    const item = event.currentTarget.closest('.nav-module-item');
    const isArrow = event.target.classList.contains('mod-arrow');

    if (isArrow) {
        event.stopPropagation();
        if (item) item.classList.toggle('open');
        return;
    }

    const modFirstStage = { 1: 1, 2: 3, 3: 9, 4: 12 }[modNum];
    const isModUnlocked = (modFirstStage <= appState.unlockedStage) || (modNum === 4 && appState.completedStages.includes(11));

    if (!isModUnlocked) {
        const reqNames = { 2: "el Mòdul 1 (Fonaments)", 3: "el Mòdul 2 (Construcció)", 4: "tots els mòduls anteriors" };
        alert(`⚠️ Aquest mòdul està bloquejat. Completa primer ${reqNames[modNum]} per accedir-hi!`);
        return;
    }

    switchModuleView(modNum);

    const curMod = getModuleForStage(appState.currentStage || 1);
    if (curMod !== modNum) {
        const modRanges = { 1: [1, 2], 2: [3, 8], 3: [9, 11], 4: [12, 12] };
        const [start, end] = modRanges[modNum];
        let target = start;
        for (let s = start; s <= end; s++) {
            if (s <= appState.unlockedStage) target = s;
        }
        goToStage(target);
    }
}

function updateNavigationLocks() {
    const curStage = appState.currentStage || 1;
    const curMod = getModuleForStage(curStage);

    // 1. Actualitza botons de fases al submenú i als desplegables
    for (let i = 1; i <= 12; i++) {
        const btn = document.getElementById(`tab-btn-${i}`);
        const lbl = document.getElementById(`nav-label-stage-${i}`);
        const dropBtn = document.getElementById(`drop-btn-${i}`);
        const dropStatus = document.getElementById(`drop-status-${i}`);

        const isUnlocked = (i <= appState.unlockedStage) || (i === 12 && appState.completedStages.includes(11));
        const isCompleted = appState.completedStages.includes(i);
        const isActive = (i === curStage);

        if (btn) {
            btn.classList.toggle('locked', !isUnlocked);
            btn.classList.toggle('completed', isCompleted);
            btn.classList.toggle('active', isActive);
        }

        if (lbl) {
            const prefix = isCompleted ? '✅ ' : (!isUnlocked ? '🔒 ' : '');
            lbl.textContent = `${prefix}${STAGE_TITLES[i]}`;
        }

        if (dropBtn) {
            dropBtn.classList.toggle('locked', !isUnlocked);
            dropBtn.classList.toggle('active', isActive);
        }

        if (dropStatus) {
            dropStatus.textContent = isCompleted ? '✅' : (!isUnlocked ? '🔒' : (isActive ? '👉' : '🔓'));
        }
    }

    // 2. Actualitza pestanyes de mòduls principals i comptadors de progrés
    const modRanges = {
        1: [1, 2],
        2: [3, 8],
        3: [9, 11],
        4: [12, 12]
    };

    for (let m = 1; m <= 4; m++) {
        const [start, end] = modRanges[m];
        const total = end - start + 1;
        let completed = 0;
        let hasUnlocked = false;

        for (let s = start; s <= end; s++) {
            if (appState.completedStages.includes(s)) completed++;
            if (s <= appState.unlockedStage || (s === 12 && appState.completedStages.includes(11))) hasUnlocked = true;
        }

        const tab = document.getElementById(`mod-tab-${m}`);
        const badge = document.getElementById(`mod-badge-${m}`);
        const grp = document.getElementById(`subgroup-mod-${m}`);

        if (tab) {
            tab.classList.toggle('active', m === curMod);
            tab.classList.toggle('completed', completed === total);
            tab.classList.toggle('locked', !hasUnlocked);
        }

        if (grp) {
            grp.classList.toggle('active', m === curMod);
        }

        if (badge) {
            if (m === 4) {
                badge.textContent = completed === 1 ? '✅ Rebut' : (hasUnlocked ? '🔓 Obert' : '🔒 Bloquejat');
            } else {
                badge.textContent = completed === total ? `${total}/${total} ✅` : `${completed}/${total}`;
            }
        }
    }
}

function goToStage(stageNum) {
    const isUnlocked = (stageNum <= appState.unlockedStage) || (stageNum === 12 && appState.completedStages.includes(11));
    if (!isUnlocked) {
        alert(`⚠️ La Fase ${stageNum} està bloquejada. Completa primer la fase actual per desbloquejar-la!`);
        return;
    }

    // Tanca els desplegables mòbils si n'hi ha algun d'obert
    document.querySelectorAll('.nav-module-item.open').forEach(el => el.classList.remove('open'));

    appState.currentStage = stageNum;
    saveState();

    document.querySelectorAll('.section-view').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(`stage-view-${stageNum}`);
    if (target) target.classList.add('active');

    const mod = getModuleForStage(stageNum);
    switchModuleView(mod);

    updateNavigationLocks();
    updateHeader();

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (stageNum === 1) renderStage1Cases();
    if (stageNum === 2) renderStage2SortGame();
    if (stageNum === 3) renderFlowchartActivity('act1');
    if (stageNum === 4) renderFlowchartActivity('act2');
    if (stageNum === 5) renderFlowchartActivity('act3');
    if (stageNum === 6) renderFlowchartActivity('act4');
    if (stageNum === 7) renderFlowchartActivity('act5');
    if (stageNum === 8) renderFlowchartActivity('act6');
    if (stageNum === 9) setBugSimSensors(34, 20);
    if (stageNum === 10) renderTraceTable();
    if (stageNum === 11) runBlackboxTest();
    if (stageNum === 12) renderDiploma();

    setTimeout(() => { requestAnimationFrame(drawAllLoopArrows); }, 60);
}

// Tanca els desplegables en fer clic a fora
document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-module-item')) {
        document.querySelectorAll('.nav-module-item.open').forEach(el => el.classList.remove('open'));
    }
});

// ============================================================================
// MODAL DE PERFIL (NOM, COGNOMS, CURS, NIVELL, AVATAR)
// ============================================================================
let selectedModalLevel = 'avancat';

function pickAvatar(emoji) {
    appState.avatar = emoji;
    document.querySelectorAll('.avatar-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.textContent.trim() === emoji);
    });
}

function openProfileModal() {
    const fnInput = document.getElementById('modal-input-firstname');
    const lnInput = document.getElementById('modal-input-lastname');
    const grInput = document.getElementById('modal-input-group');

    if (fnInput) fnInput.value = appState.firstName || '';
    if (lnInput) lnInput.value = appState.lastName || '';
    if (grInput) grInput.value = appState.studentGroup || '1r ESO A';

    pickAvatar(appState.avatar || '🤖');

    document.getElementById('profile-modal').classList.add('active');
}

function saveProfileModal() {
    const fn = (document.getElementById('modal-input-firstname').value || '').trim();
    const ln = (document.getElementById('modal-input-lastname').value || '').trim();
    const gr = (document.getElementById('modal-input-group').value || '1r ESO A').trim();

    if (!fn || !ln) {
        alert("Si us plau, introdueix tant el teu Nom com els teus Cognoms per començar!");
        return;
    }

    // Truc docent: si escriu "teacher" com a nom, desbloqueja totes les 9 fases
    if (fn.toLowerCase() === 'teacher' || fn.toLowerCase() === 'docent') {
        appState.unlockedStage = 9;
        appState.completedStages = [1, 2, 3, 4, 5, 6, 7, 8];
    }

    appState.firstName = fn;
    appState.lastName = ln;
    appState.studentName = `${fn} ${ln}`;
    appState.studentGroup = gr;
    appState.level = 'avancat';
    appState.gameStarted = true;

    saveState();
    document.getElementById('profile-modal').classList.remove('active');
    goToStage(appState.currentStage || 1);
}

function confirmExitGame() {
    if (confirm("⚠️ Vols reiniciar la càpsula per a un nou alumne/a?\nS'esborrarà el progrés actual i tornaràs a la pantalla inicial.")) {
        localStorage.removeItem(APP_STORAGE_KEY);
        window.location.reload();
    }
}

let pendingNextStage = 2;
function showVictory(stageNum, title, desc) {
    const stageKey = `stage${stageNum}`;
    const penalty = (appState.penalties && appState.penalties[stageKey]) || 0;

    document.getElementById('vic-title').textContent = title;
    document.getElementById('vic-desc').textContent = desc;

    const vicXp = document.getElementById('vic-xp');
    if (penalty > 0) {
        vicXp.innerHTML = `<span style="color:#059669;">${appState.totalXP} / 1500 XP</span> <small style="display:block; color:#dc2626;">(Penalització en aquesta fase: -${penalty} XP)</small>`;
    } else {
        vicXp.innerHTML = `<span style="color:#059669;">${appState.totalXP} / 1500 XP</span> <small style="display:block; color:#059669;">(Fase impecable sense errors! 🎯)</small>`;
    }

    if (!appState.completedStages.includes(stageNum)) {
        appState.completedStages.push(stageNum);
    }
    if (appState.unlockedStage <= stageNum) {
        appState.unlockedStage = stageNum + 1;
    }
    pendingNextStage = Math.min(12, stageNum + 1);
    saveState();
    document.getElementById('victory-modal').classList.add('active');
}

function proceedToNextStage() {
    document.getElementById('victory-modal').classList.remove('active');
    goToStage(pendingNextStage);
}

// ============================================================================
// FASE 1: SIMULADOR CAMÍ A L'ESCOLA (BUS VS METRO) + 3 REPTES AUTOCORREGIBLES
// ============================================================================
let busSimTimer = null;
let busStepTimeouts = [];

function updateBusSimSlider(val) {
    const minutes = parseInt(val, 10);
    const lbl = document.getElementById('bus-time-val');
    if (lbl) lbl.textContent = `${minutes} minuts`;

    const pill = document.getElementById('bus-decision-pill');
    const condCard = document.getElementById('bus-condition-card');
    const isMetro = minutes > 10;
    const pathBusEl = document.getElementById('sim-path-bus');
    const pathMetroEl = document.getElementById('sim-path-metro');
    const routeBadge = document.getElementById('route-active-step-badge');

    if (routeBadge) {
        routeBadge.textContent = isMetro ? 'Ruta triada: Metro 🚇' : 'Ruta triada: Bus 🚌';
        routeBadge.style.background = isMetro ? '#ef4444' : '#10b981';
        routeBadge.style.color = '#ffffff';
    }

    if (pathBusEl && pathMetroEl) {
        if (isMetro) {
            pathMetroEl.style.opacity = '1';
            pathMetroEl.style.background = '#7f1d1d';
            pathMetroEl.style.borderColor = '#ef4444';
            pathMetroEl.style.boxShadow = '0 0 10px rgba(239, 68, 68, 0.5)';
            pathBusEl.style.opacity = '0.35';
            pathBusEl.style.background = '#1e293b';
            pathBusEl.style.borderColor = '#475569';
            pathBusEl.style.boxShadow = 'none';
        } else {
            pathBusEl.style.opacity = '1';
            pathBusEl.style.background = '#064e3b';
            pathBusEl.style.borderColor = '#10b981';
            pathBusEl.style.boxShadow = '0 0 10px rgba(16, 185, 129, 0.5)';
            pathMetroEl.style.opacity = '0.35';
            pathMetroEl.style.background = '#1e293b';
            pathMetroEl.style.borderColor = '#475569';
            pathMetroEl.style.boxShadow = 'none';
        }
    }

    if (pill) {
        if (isMetro) {
            pill.style.background = '#ef4444';
            pill.style.color = '#ffffff';
            pill.textContent = 'Decisió: 🚇 METRO';
        } else {
            pill.style.background = '#10b981';
            pill.style.color = '#ffffff';
            pill.textContent = 'Decisió: 🚌 AUTOBÚS';
        }
    }

    if (condCard) {
        if (isMetro) {
            condCard.style.borderColor = '#ef4444';
            condCard.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.4rem;">
                    <span>🔍 Condició: <strong>Falten més de 10 minuts?</strong> (${minutes} &gt; 10)</span>
                    <span style="background:#fee2e2; color:#991b1b; padding:0.2rem 0.6rem; border-radius:4px; font-weight:800; font-size:0.8rem;">SÍ (Cert)</span>
                </div>
                <div style="color:#fca5a5; font-size:0.82rem; margin-top:0.45rem;">
                    ➔ Camí Dret: Com que falta massa estona, anar al <strong>Metro</strong>, sentit Sant Andreu, baixar a la 2a parada i pujar per les escales de la dreta.
                </div>
            `;
        } else {
            condCard.style.borderColor = '#22c55e';
            condCard.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.4rem;">
                    <span>🔍 Condició: <strong>Falten més de 10 minuts?</strong> (${minutes} &gt; 10)</span>
                    <span style="background:#dcfce7; color:#166534; padding:0.2rem 0.6rem; border-radius:4px; font-weight:800; font-size:0.8rem;">NO (Fals)</span>
                </div>
                <div style="color:#86efac; font-size:0.82rem; margin-top:0.45rem;">
                    ➔ Camí Esquerre: Com que arriba aviat (≤ 10 min), esperar l'<strong>Autobús</strong>, pujar i baixar a la 3a parada.
                </div>
            `;
        }
    }
}

function setBusSimTime(val) {
    const slider = document.getElementById('bus-time-slider');
    if (slider) {
        slider.value = val;
        updateBusSimSlider(val);
    }
}

function runSchoolRouteSimulation() {
    busStepTimeouts.forEach(t => clearTimeout(t));
    busStepTimeouts = [];

    const slider = document.getElementById('bus-time-slider');
    const minutes = slider ? parseInt(slider.value, 10) : 6;
    const logBox = document.getElementById('school-sim-log');
    const btn = document.getElementById('btn-run-bus-sim');

    const allNodes = [
        'sch-node-start', 'sch-node-busstop', 'sch-node-look', 'sch-node-dec',
        'sch-node-waitbus', 'sch-node-boardbus', 'sch-node-exitbus',
        'sch-node-gometro', 'sch-node-boardmetro', 'sch-node-exitmetro', 'sch-node-stairs',
        'sch-node-walk', 'sch-node-end'
    ];
    allNodes.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('sim-node-active');
    });

    const isMetro = minutes > 10;
    const steps = isMetro ? [
        { id: 'sch-node-start', text: "🏠 <strong>Pas 1:</strong> L'alumne/a surt de casa pel matí." },
        { id: 'sch-node-busstop', text: "🚏 <strong>Pas 2:</strong> Arriba a l'estació de l'autobús." },
        { id: 'sch-node-look', text: `⏱️ <strong>Pas 3:</strong> Consulta el panell informatiu: falten <strong>${minutes} minuts</strong>.` },
        { id: 'sch-node-dec', text: `🔶 <strong>Pas 4 (Decisió):</strong> Falten més de 10 minuts? (${minutes} &gt; 10) ➔ <strong>SÍ (Cert)</strong>. Tria la branca del Metro!` },
        { id: 'sch-node-gometro', text: "🚶 <strong>Pas 5:</strong> Camina cap a l'estació de metro." },
        { id: 'sch-node-boardmetro', text: "🚇 <strong>Pas 6:</strong> Puja al metro en direcció Sant Andreu." },
        { id: 'sch-node-exitmetro', text: "🛑 <strong>Pas 7:</strong> Baixa a la segona parada." },
        { id: 'sch-node-stairs', text: "↗️ <strong>Pas 8:</strong> Puja al carrer per les escales de la dreta." },
        { id: 'sch-node-walk', text: "🎒 <strong>Pas 9:</strong> Camina tranquil·lament fins a l'escola." },
        { id: 'sch-node-end', text: `🎉 <strong>JA HAS ARRIBAT!</strong> S'ha completat l'algorisme arribant a l'escola puntualment en <strong>Metro</strong>!` }
    ] : [
        { id: 'sch-node-start', text: "🏠 <strong>Pas 1:</strong> L'alumne/a surt de casa pel matí." },
        { id: 'sch-node-busstop', text: "🚏 <strong>Pas 2:</strong> Arriba a l'estació de l'autobús." },
        { id: 'sch-node-look', text: `⏱️ <strong>Pas 3:</strong> Consulta el panell informatiu: falten <strong>${minutes} minuts</strong>.` },
        { id: 'sch-node-dec', text: `🔶 <strong>Pas 4 (Decisió):</strong> Falten més de 10 minuts? (${minutes} &gt; 10) ➔ <strong>NO (Fals)</strong>. Tria la branca de l'Autobús!` },
        { id: 'sch-node-waitbus', text: "⏳ <strong>Pas 5:</strong> S'espera a l'estació de bus tranquil·lament." },
        { id: 'sch-node-boardbus', text: "🚌 <strong>Pas 6:</strong> Puja a l'autobús quan arriba." },
        { id: 'sch-node-exitbus', text: "🛑 <strong>Pas 7:</strong> Baixa a la tercera parada." },
        { id: 'sch-node-walk', text: "🎒 <strong>Pas 8:</strong> Camina tranquil·lament fins a l'escola." },
        { id: 'sch-node-end', text: `🎉 <strong>JA HAS ARRIBAT!</strong> S'ha completat l'algorisme arribant a l'escola puntualment en <strong>Autobús</strong>!` }
    ];

    if (btn) {
        btn.disabled = true;
        btn.textContent = '⏳ Simulant recorregut...';
    }

    steps.forEach((step, idx) => {
        const timeout = setTimeout(() => {
            const el = document.getElementById(step.id);
            if (el) {
                el.classList.add('sim-node-active');
                try {
                    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                } catch (_) {}
            }
            if (logBox) logBox.innerHTML = step.text;
            const routeBadge = document.getElementById('route-active-step-badge');
            if (routeBadge) {
                routeBadge.textContent = `Pas ${idx + 1} de ${steps.length}`;
            }

            if (idx === steps.length - 1) {
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = '▶️ Tornar a Simular Pas a Pas';
                }
                if (routeBadge) {
                    routeBadge.textContent = 'Arribat a l\'escola! 🎓';
                }
            }
        }, idx * 450);
        busStepTimeouts.push(timeout);
    });
}



const STAGE1_CASES_DATA = [
    {
        id: 'c1',
        title: "Cas 1: El panell marca 4 minuts",
        desc: "Surts de casa, arribes a la parada de bus i el panell electrònic indica que falten 4 minuts perquè arribi l'autobús. Quin camí segueix el diagrama?",
        options: [
            "Resposta NO al rombe: Esperes l'autobús, puges i baixes a la tercera parada.",
            "Resposta SÍ al rombe: Vas al metro i baixes a la segona parada.",
            "Tornes cap a casa perquè 4 minuts és massa temps."
        ],
        correct: 0,
        explanation: "✅ Correcte! 4 minuts NO és més de 10 minuts, per tant seguim la fletxa «No», agafem l'autobús i baixem a la 3a parada."
    },
    {
        id: 'c2',
        title: "Cas 2: El panell marca 15 minuts",
        desc: "Un altre matí arribes a l'estació de bus i veus que falten 15 minuts. Quines instruccions exactes hauràs de seguir segons el diagrama?",
        options: [
            "Pujar a l'autobús i baixar a la segona parada.",
            "Resposta SÍ al rombe: Anar al metro, pujar sentit Sant Andreu, baixar a la 2a parada i sortir per les escales de la dreta.",
            "Anar caminant directament des de la parada de bus fins a l'escola."
        ],
        correct: 1,
        explanation: "✅ Exacte! Com que 15 > 10 minuts (Sí), el diagrama ens porta al metro sentit Sant Andreu, 2a parada i escales de la dreta."
    },
    {
        id: 'c3',
        title: "Cas 3: Diferència entre persona i robot",
        desc: "Per què diem que els robots utilitzen llenguatge algorísmic i diagrames de flux en lloc de llenguatge natural?",
        options: [
            "Perquè els robots tenen sentiments i prefereixen mirar dibuixos de colors.",
            "Perquè els robots no pensen per ells mateixos: necessiten instruccions ordenades pas a pas i sense cap ambigüitat.",
            "Perquè els diagrames de flux només serveixen per anar amb autobús."
        ],
        correct: 1,
        explanation: "✅ Molt bé! Les màquines i robots no tenen idees pròpies; necessiten algorismes clars, ordenats i sense ambigüitats."
    }
];

function renderStage1Cases() {
    const container = document.getElementById('stage1-cases-container');
    if (!container) return;

    let solved = 0;
    let html = '';

    STAGE1_CASES_DATA.forEach(item => {
        const isSolved = appState.stage1Cases[item.id] === true;
        if (isSolved) solved++;

        html += `
            <div style="background:#f8fafc; border:1.5px solid ${isSolved ? '#10b981' : '#cbd5e1'}; border-radius:var(--radius-md); padding:1.15rem; display:flex; flex-direction:column; justify-content:space-between;">
                <div>
                    <h4 style="color:#0f172a; font-size:0.98rem; margin-bottom:0.4rem;">${item.title}</h4>
                    <p style="font-size:0.86rem; color:var(--text-sub); margin-bottom:0.85rem;">${item.desc}</p>
                    <div style="display:flex; flex-direction:column; gap:0.45rem;">
                        ${item.options.map((opt, idx) => `
                            <button class="btn-outline" style="text-align:left; padding:0.55rem 0.75rem; font-size:0.82rem; border-radius:8px; cursor:pointer; ${isSolved && idx === item.correct ? 'background:#dcfce7; border-color:#10b981; color:#166534; font-weight:700;' : ''}"
                                onclick="answerStage1Case('${item.id}', ${idx})" ${isSolved ? 'disabled' : ''}>
                                ${opt}
                            </button>
                        `).join('')}
                    </div>
                </div>
                <div id="fb-s1-${item.id}" style="margin-top:0.75rem; font-size:0.82rem; font-weight:600; color:${isSolved ? '#059669' : '#dc2626'};">
                    ${isSolved ? item.explanation : ''}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
    const cnt = document.getElementById('stage1-cases-counter');
    if (cnt) cnt.textContent = `${solved} / ${STAGE1_CASES_DATA.length}`;

    const btnFinish = document.getElementById('btn-finish-stage-1');
    if (btnFinish) {
        btnFinish.style.display = (solved === STAGE1_CASES_DATA.length) ? 'inline-flex' : 'none';
    }
}

function answerStage1Case(caseId, optIdx) {
    const item = STAGE1_CASES_DATA.find(c => c.id === caseId);
    if (!item) return;

    if (optIdx === item.correct) {
        appState.stage1Cases[caseId] = true;
        saveState();
        renderStage1Cases();
    } else {
        applyXpPenalty('stage1', 15);
        const fb = document.getElementById(`fb-s1-${caseId}`);
        if (fb) {
            fb.style.color = '#dc2626';
            fb.innerHTML = `❌ Resposta incorrecta (-15 XP). Torna a mirar el diagrama de flux de dalt i prova-ho de nou!`;
        }
    }
}



function finishStage1() {
    showVictory(1, "Fase 1 Superada!", "Has comprès la diferència entre el llenguatge natural humà i el llenguatge algorísmic dels robots!");
}

// ============================================================================
// FASE 2: JOC D'ARROSSEGAR CAPSES (CLASSIFICAR BLOCS D'ACCIÓ VS DECISIÓ)
// ============================================================================
const STAGE2_SORT_ITEMS = [
    { id: 'b1', text: "Anar a l'estació de bus", type: 'action' },
    { id: 'b2', text: "Falten més de 10 minuts pel bus?", type: 'decision' },
    { id: 'b3', text: "Obrir el paraigües", type: 'action' },
    { id: 'b4', text: "Està plovent?", type: 'decision' },
    { id: 'b5', text: "Esperar 10 minuts", type: 'action' },
    { id: 'b6', text: "Hi ha llum natural?", type: 'decision' },
    { id: 'b7', text: "Encendre una làmpada", type: 'action' },
    { id: 'b8', text: "Vols dormir 10 minuts més?", type: 'decision' }
];

let selectedSortItemId = null;

function renderStage2SortGame() {
    const pool = document.getElementById('sort-source-pool');
    const actList = document.getElementById('sorted-action-list');
    const decList = document.getElementById('sorted-decision-list');
    if (!pool || !actList || !decList) return;

    pool.innerHTML = '';
    actList.innerHTML = '';
    decList.innerHTML = '';

    let solvedCount = 0;

    STAGE2_SORT_ITEMS.forEach(item => {
        const placed = appState.stage2Sorted[item.id];
        if (placed === item.type) {
            solvedCount++;
            if (item.type === 'action') {
                const badge = document.createElement('div');
                badge.className = 'draggable-block type-action';
                badge.style.cursor = 'default';
                badge.innerHTML = `
                    <div class="block-badge-icon"><span>▭</span></div>
                    <span>${item.text}</span>
                    <span style="margin-left:auto; color:#059669; font-weight:800;">✅</span>
                `;
                actList.appendChild(badge);
            } else {
                const badge = document.createElement('div');
                badge.className = 'draggable-block type-decision';
                badge.style.cursor = 'default';
                badge.innerHTML = `
                    <svg class="block-diamond-svg" viewBox="0 0 275 86" preserveAspectRatio="none">
                        <polygon points="137.5,3 270,43 137.5,83 5,43" fill="#ecfdf5" stroke="#10b981" stroke-width="2.5" />
                    </svg>
                    <div class="diamond-text-wrap" style="color:#065f46;">
                        <span class="diamond-tag" style="background:#dcfce7; color:#166534; border:1px solid #86efac;">🔶 ROMBE VALIDAT ✅</span>
                        <span>${item.text}</span>
                    </div>
                `;
                decList.appendChild(badge);
            }
        } else {
            const el = document.createElement('div');
            el.className = `draggable-block ${selectedSortItemId === item.id ? 'selected-for-place' : ''}`;
            el.draggable = true;
            el.dataset.itemId = item.id;
            el.innerHTML = `
                <span style="font-size:1rem;">📦</span>
                <span>${item.text}</span>
            `;
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                selectedSortItemId = (selectedSortItemId === item.id) ? null : item.id;
                renderStage2SortGame();
            });
            el.addEventListener('dragstart', (e) => {
                selectedSortItemId = item.id;
                e.dataTransfer.setData('text/plain', item.id);
                el.classList.add('dragging');
            });
            el.addEventListener('dragend', () => el.classList.remove('dragging'));
            pool.appendChild(el);
        }
    });

    if (pool.children.length === 0) {
        pool.innerHTML = `<span style="color:#059669; font-weight:700; margin:0 auto;">🎉 Totes les capses s'han classificat correctament!</span>`;
    }

    // Configurar dropzones amb dragover/drop
    ['action', 'decision'].forEach(zoneType => {
        const dz = document.getElementById(`dropzone-${zoneType}`);
        if (!dz) return;
        dz.ondragover = (e) => {
            e.preventDefault();
            dz.style.transform = 'scale(1.02)';
        };
        dz.ondragleave = () => {
            dz.style.transform = '';
        };
        dz.ondrop = (e) => {
            e.preventDefault();
            dz.style.transform = '';
            const itemId = e.dataTransfer.getData('text/plain') || selectedSortItemId;
            if (itemId) tryPlaceSortItem(itemId, zoneType);
        };
    });

    const cnt = document.getElementById('block-sort-counter');
    if (cnt) cnt.textContent = `${solvedCount} / ${STAGE2_SORT_ITEMS.length}`;

    const btnFinish = document.getElementById('btn-finish-stage-2');
    if (btnFinish) {
        btnFinish.style.display = (solvedCount === STAGE2_SORT_ITEMS.length) ? 'inline-flex' : 'none';
    }
}

function handleSortZoneClick(zoneType) {
    if (!selectedSortItemId) return;
    tryPlaceSortItem(selectedSortItemId, zoneType);
}

function tryPlaceSortItem(itemId, targetZone) {
    const item = STAGE2_SORT_ITEMS.find(i => i.id === itemId);
    if (!item) return;

    const msgEl = document.getElementById('sort-feedback-msg');
    if (item.type === targetZone) {
        appState.stage2Sorted[itemId] = targetZone;
        selectedSortItemId = null;
        if (msgEl) {
            msgEl.style.color = '#059669';
            msgEl.textContent = `✅ Molt bé! «${item.text}» és un ${targetZone === 'action' ? "Bloc d'Acció (Rectangle)" : "Bloc de Decisió (Rombe)"}.`;
        }
        saveState();
        renderStage2SortGame();
    } else {
        applyXpPenalty('stage2', 15);
        if (msgEl) {
            msgEl.style.color = '#dc2626';
            msgEl.textContent = `❌ Compte (-15 XP)! «${item.text}» ${item.type === 'decision' ? 'planteja una pregunta de Sí/No, per tant va als Rombes de Decisió!' : 'és una ordre directa sense pregunta, per tant va als Rectangles d\'Acció!'}`;
        }
    }
}



function finishStage2() {
    showVictory(2, "Fase 2 Superada!", "Ja saps distingir perfectament els blocs d'acció (rectangles), els blocs de decisió (rombes) i els diagrames oberts i tancats!");
}

// ============================================================================
// MOTOR INTERACTIU D'ARROSSEGAR CAPSES PER A LES 3 ACTIVITATS DEL PDF
// (Suporta HTML5 Drag & Drop + Pointer Touch Drag + Click-to-Place)
// ============================================================================
const ACTIVITIES_CONFIG = {
    act1: {
        stageKey: 'stage3',
        blocks: [
            { id: 'a1_b1', text: 'Sona el despertador', type: 'action' },
            { id: 'a1_b2', text: 'Vols dormir 10 minuts més?', type: 'decision' },
            { id: 'a1_b3', text: 'Prem el botó i espera 10 minuts', type: 'action' },
            { id: 'a1_b4', text: 'Atura el despertador', type: 'action' },
            { id: 'a1_b5', text: "Aixeca't del llit", type: 'action' }
        ],
        slots: {
            s1: { expectedType: 'action', acceptedIds: ['a1_b1'] },
            s2: { expectedType: 'decision', acceptedIds: ['a1_b2'] },
            s3: { expectedType: 'action', acceptedIds: ['a1_b3'] },
            s4: { expectedType: 'action', acceptedIds: ['a1_b4'] },
            s5: { expectedType: 'action', acceptedIds: ['a1_b5'] }
        }
    },
    act2: {
        stageKey: 'stage4',
        blocks: [
            { id: 'a2_b1', text: 'Està plovent?', type: 'decision' },
            { id: 'a2_b2', text: 'El paraigües està obert?', type: 'decision' },
            { id: 'a2_b3', text: 'El paraigües està obert?', type: 'decision' },
            { id: 'a2_b4', text: 'Obrir el paraigües', type: 'action' },
            { id: 'a2_b5', text: 'Mantenir el paraigües obert', type: 'action' },
            { id: 'a2_b6', text: 'Tancar el paraigües', type: 'action' }
        ],
        slots: {
            s1: { expectedType: 'decision', acceptedIds: ['a2_b1'] },
            s2: { expectedType: 'decision', acceptedIds: ['a2_b2', 'a2_b3'] },
            s3: { expectedType: 'decision', acceptedIds: ['a2_b2', 'a2_b3'] },
            s4: { expectedType: 'action', acceptedIds: ['a2_b4'] },
            s5: { expectedType: 'action', acceptedIds: ['a2_b5'] },
            s6: { expectedType: 'action', acceptedIds: ['a2_b6'] }
        }
    },
    act3: {
        stageKey: 'stage5',
        blocks: [
            { id: 'a3_b1', text: 'Hi ha llum natural?', type: 'decision' },
            { id: 'a3_b2', text: "Hi ha persones a l'aula?", type: 'decision' },
            { id: 'a3_b3', text: 'Encén la làmpada', type: 'action' },
            { id: 'a3_b4', text: 'Apaga la làmpada', type: 'action' },
            { id: 'a3_b5', text: 'Apaga la làmpada', type: 'action' }
        ],
        slots: {
            s1: { expectedType: 'decision', acceptedIds: ['a3_b1'] },
            s2: { expectedType: 'decision', acceptedIds: ['a3_b2'] },
            s3: { expectedType: 'action', acceptedIds: ['a3_b3'] },
            s4: { expectedType: 'action', acceptedIds: ['a3_b4', 'a3_b5'] },
            s5: { expectedType: 'action', acceptedIds: ['a3_b4', 'a3_b5'] }
        }
    },
    act4: {
        stageKey: 'stage6',
        blocks: [
            { id: 'a4_b1', text: 'Bateria baixa (< 15%)?', type: 'decision' },
            { id: 'a4_b2', text: 'Detecta obstacle davant?', type: 'decision' },
            { id: 'a4_b3', text: 'Girar 90° a la dreta', type: 'action' },
            { id: 'a4_b4', text: 'Avançar 50 cm i aspirar pols', type: 'action' },
            { id: 'a4_b5', text: 'Tornar a la base de càrrega', type: 'action' },
            { id: 'a4_b6', text: 'Recarregar bateria al 100%', type: 'action' }
        ],
        slots: {
            s1: { expectedType: 'decision', acceptedIds: ['a4_b1'] },
            s2: { expectedType: 'decision', acceptedIds: ['a4_b2'] },
            s3: { expectedType: 'action', acceptedIds: ['a4_b3'] },
            s4: { expectedType: 'action', acceptedIds: ['a4_b4'] },
            s5: { expectedType: 'action', acceptedIds: ['a4_b5'] },
            s6: { expectedType: 'action', acceptedIds: ['a4_b6'] }
        }
    },
    act5: {
        stageKey: 'stage7',
        blocks: [
            { id: 'a5_b1', text: 'Polsador de vianants activat?', type: 'decision' },
            { id: 'a5_b2', text: 'Mantenir semàfor cotxes en VERD', type: 'action' },
            { id: 'a5_b3', text: 'Han passat > 30 s de cotxes en verd?', type: 'decision' },
            { id: 'a5_b4', text: 'Esperar 5 s de seguretat', type: 'action' },
            { id: 'a5_b5', text: 'Canviar cotxes a ÀMBRE (3 s)', type: 'action' },
            { id: 'a5_b6', text: 'Cotxes en VERMELL i vianants en VERD', type: 'action' },
            { id: 'a5_b7', text: 'Esperar 15 s de pas i reiniciar', type: 'action' }
        ],
        slots: {
            s1: { expectedType: 'decision', acceptedIds: ['a5_b1'] },
            s2: { expectedType: 'action', acceptedIds: ['a5_b2'] },
            s3: { expectedType: 'decision', acceptedIds: ['a5_b3'] },
            s4: { expectedType: 'action', acceptedIds: ['a5_b4'] },
            s5: { expectedType: 'action', acceptedIds: ['a5_b5'] },
            s6: { expectedType: 'action', acceptedIds: ['a5_b6'] },
            s7: { expectedType: 'action', acceptedIds: ['a5_b7'] }
        }
    },
    act6: {
        stageKey: 'stage8',
        blocks: [
            { id: 'a6_b1', text: 'Detecta vehicle davant la barrera?', type: 'decision' },
            { id: 'a6_b2', text: 'Mantenir la barrera baixada', type: 'action' },
            { id: 'a6_b3', text: 'Queden places lliures al pàrquing?', type: 'decision' },
            { id: 'a6_b4', text: 'Encendre llum vermella i senyal "COMPLET"', type: 'action' },
            { id: 'a6_b5', text: 'Aixecar la barrera i encendre llum verda', type: 'action' },
            { id: 'a6_b6', text: 'El vehicle ha travessat la barrera?', type: 'decision' },
            { id: 'a6_b7', text: 'Baixar la barrera i restar 1 plaça lliure', type: 'action' }
        ],
        slots: {
            s1: { expectedType: 'decision', acceptedIds: ['a6_b1'] },
            s2: { expectedType: 'action', acceptedIds: ['a6_b2', 'a6_b4'] },
            s3: { expectedType: 'decision', acceptedIds: ['a6_b3'] },
            s4: { expectedType: 'action', acceptedIds: ['a6_b4', 'a6_b2'] },
            s5: { expectedType: 'action', acceptedIds: ['a6_b5'] },
            s6: { expectedType: 'decision', acceptedIds: ['a6_b6'] },
            s7: { expectedType: 'action', acceptedIds: ['a6_b7'] }
        }
    }
}

;

let activeSelectedBlock = { actId: null, blockId: null };

function renderFlowchartActivity(actId) {
    const cfg = ACTIVITIES_CONFIG[actId];
    if (!cfg) return;

    const paletteEl = document.getElementById(`${actId}-palette`);
    if (!paletteEl) return;

    if (!appState.boards[actId]) appState.boards[actId] = {};
    const currentPlacement = appState.boards[actId];
    const usedBlockIds = Object.values(currentPlacement);

    // Renderitzar paleta amb les capses que encara no estan col·locades
    paletteEl.innerHTML = '';
    const availableBlocks = cfg.blocks.filter(b => !usedBlockIds.includes(b.id));

    const countBadge = document.getElementById(`${actId}-palette-count`);
    if (countBadge) countBadge.textContent = `${availableBlocks.length} disponibles`;

    if (availableBlocks.length === 0) {
        paletteEl.innerHTML = `
            <div style="text-align:center; padding:1rem 0.5rem; color:#059669; font-size:0.84rem; font-weight:700;">
                ✨ Totes les capses estan col·locades al diagrama!<br>Prem «✅ Autocorregir Diagrama» per verificar-ho.
            </div>
        `;
    } else {
        availableBlocks.forEach(block => {
            const isSelected = (activeSelectedBlock.actId === actId && activeSelectedBlock.blockId === block.id);
            const itemEl = document.createElement('div');
            itemEl.draggable = true;
            itemEl.dataset.act = actId;
            itemEl.dataset.blockId = block.id;

            if (block.type === 'action') {
                itemEl.className = `draggable-block type-action ${isSelected ? 'selected-for-place' : ''}`;
                itemEl.innerHTML = `
                    <div class="block-badge-icon"><span>▭</span></div>
                    <span>${block.text}</span>
                `;
            } else {
                itemEl.className = `draggable-block type-decision ${isSelected ? 'selected-for-place' : ''}`;
                itemEl.innerHTML = `
                    <svg class="block-diamond-svg" viewBox="0 0 275 86" preserveAspectRatio="none">
                        <polygon points="137.5,3 270,43 137.5,83 5,43" />
                    </svg>
                    <div class="diamond-text-wrap">
                        <span class="diamond-tag">🔶 ROMBE (DECISIÓ)</span>
                        <span>${block.text}</span>
                    </div>
                `;
            }

            itemEl.addEventListener('click', (e) => {
                e.stopPropagation();
                if (activeSelectedBlock.actId === actId && activeSelectedBlock.blockId === block.id) {
                    activeSelectedBlock = { actId: null, blockId: null };
                } else {
                    activeSelectedBlock = { actId, blockId: block.id };
                }
                renderFlowchartActivity(actId);
            });

            itemEl.addEventListener('dragstart', (e) => {
                activeSelectedBlock = { actId, blockId: block.id };
                e.dataTransfer.setData('text/plain', JSON.stringify({ actId, blockId: block.id }));
                itemEl.classList.add('dragging');
            });

            itemEl.addEventListener('dragend', () => {
                itemEl.classList.remove('dragging');
            });

            paletteEl.appendChild(itemEl);
        });
    }

    // Renderitzar tots els slots del tauler
    Object.keys(cfg.slots).forEach(slotKey => {
        const slotNum = slotKey.replace('s', '');
        const slotEl = document.getElementById(`slot-${actId}-${slotNum}`);
        if (!slotEl) return;

        slotEl.classList.remove('slot-correct', 'slot-wrong');
        const placedBlockId = currentPlacement[slotKey];
        const slotDef = cfg.slots[slotKey];
        const isDecision = (slotDef.expectedType === 'decision');

        if (placedBlockId) {
            const blockObj = cfg.blocks.find(b => b.id === placedBlockId);
            slotEl.classList.add('filled');
            if (isDecision) {
                slotEl.innerHTML = `
                    <svg class="slot-diamond-bg" viewBox="0 0 275 104" preserveAspectRatio="none">
                        <polygon points="137.5,4 270,52 137.5,100 5,52" />
                    </svg>
                    <div class="slot-diamond-content">
                        <button type="button" class="slot-remove-btn diamond-remove-btn" title="Retirar capsa" onclick="removeBlockFromSlot(event, '${actId}', '${slotKey}')">✕</button>
                        <div class="slot-diamond-text-wrap">
                            <span class="block-diamond-tag">🔶 DECISIÓ</span>
                            <span class="block-diamond-label">${blockObj.text}</span>
                        </div>
                    </div>
                `;
            } else {
                slotEl.innerHTML = `
                    <button type="button" class="slot-remove-btn" title="Retirar capsa" onclick="removeBlockFromSlot(event, '${actId}', '${slotKey}')">✕</button>
                    <div class="slot-filled-content">
                        <span class="block-shape-tag tag-action">🟦 RECTANGLE (ACCIÓ)</span>
                        <span class="block-text-label">${blockObj.text}</span>
                    </div>
                `;
            }
        } else {
            slotEl.classList.remove('filled');
            if (isDecision) {
                slotEl.innerHTML = `
                    <svg class="slot-diamond-bg empty" viewBox="0 0 275 104" preserveAspectRatio="none">
                        <polygon points="137.5,4 270,52 137.5,100 5,52" />
                    </svg>
                    <div class="slot-diamond-content">
                        <span class="slot-placeholder-label">
                            <span class="diamond-tag" style="font-size:0.88rem; font-weight:800;">🔶 DECISIÓ</span>
                        </span>
                    </div>
                `;
            } else {
                slotEl.innerHTML = `
                    <span class="slot-placeholder-label">
                        <span style="font-weight:800; font-size:0.88rem; color:#1e40af; display:block;">🟦 ACCIÓ</span>
                    </span>
                `;
            }
        }

        // Esdeveniments dragover / drop sobre l'slot
        slotEl.ondragover = (e) => {
            e.preventDefault();
            slotEl.classList.add('drag-over');
        };
        slotEl.ondragleave = () => {
            slotEl.classList.remove('drag-over');
        };
        slotEl.ondrop = (e) => {
            e.preventDefault();
            slotEl.classList.remove('drag-over');
            let payload = null;
            try {
                payload = JSON.parse(e.dataTransfer.getData('text/plain'));
            } catch (_) {}
            const blockId = (payload && payload.actId === actId) ? payload.blockId : (activeSelectedBlock.actId === actId ? activeSelectedBlock.blockId : null);
            if (blockId) {
                placeBlockInSlot(actId, slotKey, blockId);
            }
        };
    });

    // Mostrar botó de superar fase si ja estava superada
    const stageBtnMap = { 
        act1: 'btn-finish-stage-3', 
        act2: 'btn-finish-stage-4', 
        act3: 'btn-finish-stage-5',
        act4: 'btn-finish-stage-6',
        act5: 'btn-finish-stage-7'
    };
    const finishBtn = document.getElementById(stageBtnMap[actId]);
    if (finishBtn) {
        finishBtn.style.display = appState.boardCleared[actId] ? 'inline-flex' : 'none';
    }

    setTimeout(() => { requestAnimationFrame(drawAllLoopArrows); }, 50);
}

function handleSlotClick(actId, slotKey) {
    if (activeSelectedBlock.actId === actId && activeSelectedBlock.blockId) {
        placeBlockInSlot(actId, slotKey, activeSelectedBlock.blockId);
    } else if (appState.boards[actId] && appState.boards[actId][slotKey]) {
        // Si fa clic a un slot ocupat sense capsa seleccionada, la retorna a la paleta
        delete appState.boards[actId][slotKey];
        saveState();
        renderFlowchartActivity(actId);
    }
}

function placeBlockInSlot(actId, slotKey, blockId) {
    if (!appState.boards[actId]) appState.boards[actId] = {};
    // Si aquesta capsa estava en un altre slot, l'alliberem
    Object.keys(appState.boards[actId]).forEach(k => {
        if (appState.boards[actId][k] === blockId) delete appState.boards[actId][k];
    });
    appState.boards[actId][slotKey] = blockId;
    activeSelectedBlock = { actId: null, blockId: null };
    saveState();
    renderFlowchartActivity(actId);
}

function removeBlockFromSlot(event, actId, slotKey) {
    event.stopPropagation();
    if (appState.boards[actId]) {
        delete appState.boards[actId][slotKey];
        saveState();
        renderFlowchartActivity(actId);
    }
}

function resetActivityBoard(actId) {
    appState.boards[actId] = {};
    activeSelectedBlock = { actId: null, blockId: null };
    const fb = document.getElementById(`${actId}-feedback-box`);
    if (fb) fb.style.display = 'none';
    saveState();
    renderFlowchartActivity(actId);
}

function checkActivityBoard(actId) {
    const cfg = ACTIVITIES_CONFIG[actId];
    if (!cfg) return;

    const currentPlacement = appState.boards[actId] || {};
    const slotKeys = Object.keys(cfg.slots);

    // Comprovar si hi ha caselles buides
    const missing = slotKeys.filter(k => !currentPlacement[k]);
    const fbBox = document.getElementById(`${actId}-feedback-box`) || document.getElementById(`${actId}-feedback`);

    if (missing.length > 0) {
        if (fbBox) {
            fbBox.style.display = 'block';
            fbBox.style.background = '#fffbeb';
            fbBox.style.border = '1.5px solid #fcd34d';
            fbBox.style.color = '#92400e';
            fbBox.innerHTML = `⚠️ Encara et falten <strong>${missing.length} capses</strong> per col·locar al diagrama abans de corregir-lo!`;
        }
        return;
    }

    let errors = 0;
    let wrongDetails = [];

    slotKeys.forEach(slotKey => {
        const slotNum = slotKey.replace('s', '');
        const slotEl = document.getElementById(`slot-${actId}-${slotNum}`);
        const placedId = currentPlacement[slotKey];
        const slotDef = cfg.slots[slotKey];
        const isCorrect = slotDef.acceptedIds.includes(placedId);

        if (slotEl) {
            slotEl.classList.remove('slot-correct', 'slot-wrong');
            slotEl.classList.add(isCorrect ? 'slot-correct' : 'slot-wrong');
        }

        if (!isCorrect) {
            errors++;
            const placedBlock = cfg.blocks.find(b => b.id === placedId);
            if (placedBlock && placedBlock.type !== slotDef.expectedType) {
                wrongDetails.push(`Has posat «${placedBlock.text}» (${placedBlock.type === 'action' ? 'Acció' : 'Decisió'}) en una casella de ${slotDef.expectedType === 'action' ? 'Rectangle d\'Acció' : 'Rombe de Decisió'}.`);
            } else if (placedBlock) {
                wrongDetails.push(`La capsa «${placedBlock.text}» no correspon a aquesta posició lògica del flux.`);
            }
        }
    });

    if (errors === 0) {
        appState.boardCleared[actId] = true;
        saveState();
        if (fbBox) {
            fbBox.style.display = 'block';
            fbBox.style.background = '#dcfce7';
            fbBox.style.border = '1.5px solid #86efac';
            fbBox.style.color = '#166534';
            fbBox.innerHTML = `🎯 <strong>Diagrama de flux 100% correcte!</strong> Tots els blocs d'acció, blocs de decisió i fletxes de bucle estan perfectament estructurats.`;
        }
        const stageBtnMap = {
            act1: 'btn-finish-stage-3',
            act2: 'btn-finish-stage-4',
            act3: 'btn-finish-stage-5',
            act4: 'btn-finish-stage-6',
            act5: 'btn-finish-stage-7',
            act6: 'btn-finish-stage-8'
        };
        const finishBtn = document.getElementById(stageBtnMap[actId]);
        if (finishBtn) finishBtn.style.display = 'inline-flex';
    } else {
        applyXpPenalty(cfg.stageKey, errors * 15);
        if (fbBox) {
            fbBox.style.display = 'block';
            fbBox.style.background = '#fee2e2';
            fbBox.style.border = '1.5px solid #fca5a5';
            fbBox.style.color = '#991b1b';
            fbBox.innerHTML = `
                ❌ <strong>S'han detectat ${errors} caselles incorrectes (-${errors * 15} XP):</strong>
                <ul style="margin-top:0.4rem; padding-left:1.25rem; font-size:0.86rem;">
                    ${wrongDetails.map(d => `<li>${d}</li>`).join('')}
                </ul>
                <div style="margin-top:0.4rem; font-size:0.82rem;">💡 Clica la ✕ de les caselles vermelles per retirar-les i posar-les al lloc correcte!</div>
            `;
        }
    }
}



function finishStage3() {
    showVictory(3, "Activitat 1 Superada: El Despertador!", "Has construït el teu primer diagrama de flux amb un bloc de decisió i un bucle de repetició de 10 minuts!");
}

function finishStage4() {
    showVictory(4, "Activitat 2 Superada: L'Ocellet en la Gàbia!", "Has corregit el diagrama per convertir-lo en un bucle tancat que obre el paraigües quan plou i el tanca quan fa sol!");
}

function finishStage5() {
    showVictory(5, "Activitat 3 Superada: La Làmpada Automàtica!", "Has programat el diagrama de flux amb doble sensor (llum natural + presència de persones) en cercle lògic per estalviar energia!");
}

function finishStage6() {
    showVictory(6, "Activitat 4 Superada: El Robot Aspirador!", "Has construït amb èxit el diagrama de control del robot amb doble rombe de decisió (bateria i sensors d'obstacles) i bucle de neteja continu!");
}

function finishStage7() {
    showVictory(7, "Activitat 5 Superada: El Semàfor Intel·ligent!", "Has programat la lògica de trànsit avançada amb polsador de vianants, comprovació de temps de seguretat i cicle de semàfors!");
}

function finishStage8() {
    showVictory(8, "Activitat 6 Superada: La Barrera del Pàrquing!", "Has programat amb èxit el sistema de control d'accés complet! Ara passem als reptes avançats: comencem amb el Caçador de Bugs!");
}

// ============================================================================
// SIMULADORS INTERACTIUS DE LES ACTIVITATS 1, 2 I 3
// ============================================================================

// Simulador Activitat 1: Despertador
let alarmMinutesOffset = 0;
function simAlarmAction(action) {
    const clockEl = document.getElementById('alarm-sim-clock');
    const statusEl = document.getElementById('alarm-sim-status');
    if (!clockEl || !statusEl) return;

    if (action === 'reset') {
        alarmMinutesOffset = 0;
        clockEl.textContent = '07:00';
        statusEl.style.color = '#fde047';
        statusEl.innerHTML = `🔔 <strong>07:00 — RIIIING! Sona el despertador!</strong> Què decideixes al bloc de decisió (rombe)?`;
        return;
    }

    if (action === 'snooze') {
        alarmMinutesOffset += 10;
        const hrs = 7 + Math.floor(alarmMinutesOffset / 60);
        const mins = alarmMinutesOffset % 60;
        const timeStr = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
        clockEl.textContent = timeStr;
        statusEl.style.color = '#38bdf8';
        statusEl.innerHTML = `🔁 <strong>Decisió: SÍ (Vols dormir 10 min més)</strong> → Acció: Prems el botó i esperes 10 minuts → <strong>Bucle actiu:</strong> A les <strong>${timeStr}</strong> torna a l'inici i <strong>SONA EL DESPERTADOR DE NOU! 🔔</strong>`;
    } else if (action === 'wakeup') {
        const hrs = 7 + Math.floor(alarmMinutesOffset / 60);
        const mins = alarmMinutesOffset % 60;
        const timeStr = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
        statusEl.style.color = '#4ade80';
        statusEl.innerHTML = `☀️ <strong>Decisió: NO (No vols dormir més)</strong> → Acció 1: <em>Atures el despertador</em> → Acció 2: <em>T'aixeques del llit a les ${timeStr}</em>. <strong>Procés finalitzat! Bon dia! 🎉</strong>`;
    }
}

// Simulador Activitat 2: L'Ocellet en la Gàbia (Interactiu)
let birdSimState = {
    weather: 'sun',      // 'sun' | 'rain'
    umbrella: 'closed'   // 'open' | 'closed'
};

function setBirdWeatherState(weather) {
    birdSimState.weather = weather;
    updateBirdSimUI();
}

function toggleBirdUmbrellaManual() {
    birdSimState.umbrella = (birdSimState.umbrella === 'open') ? 'closed' : 'open';
    updateBirdSimUI();
}

function runBirdRobotEvaluation() {
    // Lògica de l'algorisme:
    // Si plou: ha d'estar obert (si està tancat, l'obre)
    // Si fa sol: ha d'estar tancat (si està obert, el tanca perquè l'ocell rebi la llum del sol)
    if (birdSimState.weather === 'rain') {
        if (birdSimState.umbrella === 'closed') {
            birdSimState.umbrella = 'open';
        }
    } else {
        if (birdSimState.umbrella === 'open') {
            birdSimState.umbrella = 'closed';
        }
    }
    updateBirdSimUI();
}

function runBirdScenario(scenario) {
    if (scenario === 'storm') {
        birdSimState.weather = 'rain';
        birdSimState.umbrella = 'open';
    } else if (scenario === 'clearsky') {
        birdSimState.weather = 'sun';
        birdSimState.umbrella = 'closed';
    }
    updateBirdSimUI();
}

function updateBirdSimUI() {
    const btnSun = document.getElementById('btn-bird-sun');
    const btnRain = document.getElementById('btn-bird-rain');
    const btnUmb = document.getElementById('btn-bird-umb-toggle');
    const stage = document.getElementById('bird-sim-stage');
    const skyBadge = document.getElementById('bird-sky-badge');
    const skyEmoji = document.getElementById('bird-sky-emoji');
    const umbVis = document.getElementById('bird-umbrella-visual');
    const birdEmoji = document.getElementById('bird-emoji');
    const moodText = document.getElementById('bird-mood-text');
    const logicExp = document.getElementById('bird-logic-explanation');

    if (!stage) return;

    // 1. Estat del temps (Cel i botons)
    if (birdSimState.weather === 'sun') {
        if (btnSun) { btnSun.className = 'btn btn-sm'; btnSun.style.background = '#facc15'; btnSun.style.color = '#0f172a'; }
        if (btnRain) { btnRain.className = 'btn btn-sm btn-outline'; btnRain.style.background = '#ffffff'; btnRain.style.color = ''; }
        stage.style.background = 'linear-gradient(180deg, #bae6fd 0%, #e0f2fe 100%)';
        stage.style.borderColor = '#38bdf8';
        if (skyBadge) {
            skyBadge.style.background = '#ffffff';
            skyBadge.style.color = '#b45309';
            skyBadge.style.borderColor = '#fde68a';
            skyBadge.innerHTML = '☀️ Temps: Assolellat (Fa bon temps)';
        }
        if (skyEmoji) skyEmoji.textContent = '☀️ ⛅';
    } else {
        if (btnRain) { btnRain.className = 'btn btn-sm'; btnRain.style.background = '#0284c7'; btnRain.style.color = '#ffffff'; }
        if (btnSun) { btnSun.className = 'btn btn-sm btn-outline'; btnSun.style.background = '#ffffff'; btnSun.style.color = ''; }
        stage.style.background = 'linear-gradient(180deg, #334155 0%, #1e293b 100%)';
        stage.style.borderColor = '#0284c7';
        if (skyBadge) {
            skyBadge.style.background = '#0f172a';
            skyBadge.style.color = '#7dd3fc';
            skyBadge.style.borderColor = '#0284c7';
            skyBadge.innerHTML = '🌧️ Temps: Plou (Tempesta d\'aigua)';
        }
        if (skyEmoji) skyEmoji.textContent = '🌧️ ⛈️ 💧';
    }

    // 2. Botó del paraigües
    if (btnUmb) {
        if (birdSimState.umbrella === 'open') {
            btnUmb.innerHTML = '☂️ Paraigües: OBERT';
            btnUmb.style.background = '#e0f2fe';
            btnUmb.style.borderColor = '#0284c7';
            btnUmb.style.color = '#0369a1';
        } else {
            btnUmb.innerHTML = '🌂 Paraigües: TANCAT';
            btnUmb.style.background = '#ffffff';
            btnUmb.style.borderColor = '#cbd5e1';
            btnUmb.style.color = '#475569';
        }
    }

    // 3. Representació visual del paraigües
    if (umbVis) {
        if (birdSimState.umbrella === 'open') {
            umbVis.textContent = '☂️';
            umbVis.style.transform = 'translateY(6px) scale(1.15)';
        } else {
            umbVis.textContent = '🌂';
            umbVis.style.transform = 'translateY(-8px) scale(0.9)';
        }
    }

    // 4. Estat i benestar de l'ocellet
    if (birdSimState.weather === 'sun') {
        if (birdSimState.umbrella === 'closed') {
            if (birdEmoji) birdEmoji.textContent = '🐦';
            if (moodText) {
                moodText.style.color = '#0369a1';
                moodText.innerHTML = '✨ <strong>L\'ocellet veu el sol i canta feliç!</strong> 🎵';
            }
            if (logicExp) {
                logicExp.innerHTML = '🤖 <strong>Comportament del robot:</strong> Fa bon temps i el paraigües està tancat. L\'ocellet gaudeix de la llum natural i el robot continua observant el cel.';
            }
        } else {
            // Fa sol però el paraigües continua obert!
            if (birdEmoji) birdEmoji.textContent = '🐦🌑';
            if (moodText) {
                moodText.style.color = '#dc2626';
                moodText.innerHTML = '⚠️ <strong>Problema:</strong> Fa sol però el paraigües continua obert i li tapa la llum! L\'ocellet està a les fosques!';
            }
            if (logicExp) {
                logicExp.innerHTML = '🤖 <strong>Comportament del robot:</strong> No plou però el paraigües estava obert. El robot l\'ha de tancar perquè entri la claror del sol. Prem «🤖 Què fa el robot?» per tancar-lo.';
            }
        }
    } else {
        // Plou
        if (birdSimState.umbrella === 'open') {
            if (birdEmoji) birdEmoji.textContent = '🐦🛡️';
            if (moodText) {
                moodText.style.color = '#10b981';
                moodText.innerHTML = '🌧️ <strong>L\'ocellet està sec i ben protegit de la pluja sota el paraigües!</strong>';
            }
            if (logicExp) {
                logicExp.innerHTML = '🤖 <strong>Comportament del robot:</strong> Està plovent i el paraigües ja està obert. L\'ocell no es mulla i el robot continua atent al temps.';
            }
        } else {
            // Plou i el paraigües està tancat!
            if (birdEmoji) birdEmoji.textContent = '🐦💦';
            if (moodText) {
                moodText.style.color = '#dc2626';
                moodText.innerHTML = '🚨 <strong>Perill:</strong> Està plovent i el paraigües està tancat! L\'ocellet s\'està mullant!';
            }
            if (logicExp) {
                logicExp.innerHTML = '🤖 <strong>Comportament del robot:</strong> Està plovent i el paraigües està tancat. El robot l\'ha d\'obrir immediatament per protegir-lo de l\'aigua. Prem «🤖 Què fa el robot?» per obrir-lo.';
            }
        }
    }
}

function setBirdWeather(weather) {
    setBirdWeatherState(weather);
}

// Simulador Activitat 3: Làmpada Automàtica
let simSunlight = true;
let simPresence = false;

function toggleLampSensor(sensor) {
    if (sensor === 'sun') simSunlight = !simSunlight;
    if (sensor === 'presence') simPresence = !simPresence;

    const btnSun = document.getElementById('btn-sim-sunlight');
    const btnPres = document.getElementById('btn-sim-presence');
    const bulb = document.getElementById('lamp-bulb-icon');
    const stateBadge = document.getElementById('lamp-state-badge');
    const trace = document.getElementById('lamp-logic-trace');

    if (btnSun) {
        btnSun.style.background = simSunlight ? '#facc15' : '#334155';
        btnSun.style.color = simSunlight ? '#0f172a' : '#f8fafc';
        btnSun.textContent = simSunlight ? '☀️ Sensor Llum Natural: SÍ (Dia)' : '🌙 Sensor Llum Natural: NO (Fosc)';
    }

    if (btnPres) {
        btnPres.style.background = simPresence ? '#10b981' : '#334155';
        btnPres.style.color = '#ffffff';
        btnPres.textContent = simPresence ? '👥 Sensor Moviment: SÍ (Hi ha persones a l\'aula)' : '🚪 Sensor Moviment: NO (Aula buida)';
    }

    const lampOn = (!simSunlight && simPresence);

    if (bulb) {
        bulb.style.filter = lampOn ? 'drop-shadow(0 0 18px #facc15)' : 'grayscale(1)';
        bulb.style.transform = lampOn ? 'scale(1.18)' : 'scale(1)';
    }

    if (stateBadge && trace) {
        if (lampOn) {
            stateBadge.style.color = '#fde047';
            stateBadge.textContent = '💡 LÀMPADA ENCESA (Il·luminant l\'aula per estudiar)';
            trace.innerHTML = 'Camí del bucle: <strong>Hi ha llum natural? NO → Hi ha persones a l\'aula? SÍ → Encén la làmpada ↺</strong>';
        } else if (simSunlight) {
            stateBadge.style.color = '#4ade80';
            stateBadge.textContent = '🌱 LÀMPADA APAGADA (Ja hi ha llum natural suficient)';
            trace.innerHTML = 'Camí del bucle: <strong>Hi ha llum natural? SÍ → Apaga la làmpada ↺</strong> (Estalvi energètic)';
        } else {
            stateBadge.style.color = '#38bdf8';
            stateBadge.textContent = '🌱 LÀMPADA APAGADA (No hi ha ningú a l\'habitació)';
            trace.innerHTML = 'Camí del bucle: <strong>Hi ha llum natural? NO → Hi ha persones a l\'aula? NO → Apaga la làmpada ↺</strong>';
        }
    }
}



// Simulador Activitat 4: Robot Aspirador (Roomba)
let simRoombaBattery = 85;
let simRoombaObstacle = false;

function simRoombaToggleBattery() {
    simRoombaBattery = (simRoombaBattery === 85) ? 10 : 85;
    const badge = document.getElementById('roomba-battery-badge');
    const btn = document.getElementById('btn-roomba-battery');
    if (badge) {
        if (simRoombaBattery >= 15) {
            badge.style.background = '#ecfdf5';
            badge.style.color = '#059669';
            badge.style.borderColor = '#a7f3d0';
            badge.innerHTML = `🔋 Bateria: ${simRoombaBattery}% (Òptima)`;
        } else {
            badge.style.background = '#fef2f2';
            badge.style.color = '#dc2626';
            badge.style.borderColor = '#fca5a5';
            badge.innerHTML = `🪫 Bateria: ${simRoombaBattery}% (Crítica &lt; 15%)`;
        }
    }
    if (btn) {
        btn.textContent = simRoombaBattery >= 15 ? '⚡ Canviar a Bateria Crítica (10%)' : '⚡ Canviar a Bateria Òptima (85%)';
    }
    simRoombaStep();
}

function simRoombaToggleObstacle() {
    simRoombaObstacle = !simRoombaObstacle;
    const obsInd = document.getElementById('roomba-obstacle-indicator');
    const btn = document.getElementById('btn-roomba-obstacle');
    if (obsInd) {
        obsInd.innerHTML = simRoombaObstacle ? '🧱 <strong>Obstacle detectat davant!</strong>' : '🟢 <strong>Camí lliure</strong>';
        obsInd.style.color = simRoombaObstacle ? '#d97706' : '#059669';
    }
    if (btn) {
        btn.textContent = simRoombaObstacle ? '🟢 Retirar Obstacle (Camí lliure)' : '🧱 Col·locar Obstacle davant';
    }
    simRoombaStep();
}

function simRoombaStep() {
    const robot = document.getElementById('roomba-visual-robot');
    const statusText = document.getElementById('roomba-status-text');
    if (!robot || !statusText) return;

    if (simRoombaBattery < 15) {
        robot.textContent = '🔌';
        robot.style.borderColor = '#ef4444';
        robot.style.transform = 'scale(0.95)';
        statusText.style.background = '#fef2f2';
        statusText.style.borderColor = '#fca5a5';
        statusText.style.color = '#991b1b';
        statusText.innerHTML = `⚠️ <strong>Estat del robot:</strong> La bateria és massa baixa (${simRoombaBattery}%). El robot atura la neteja i va directe a la base de càrrega.`;
    } else if (simRoombaObstacle) {
        robot.textContent = '🔄';
        robot.style.borderColor = '#f59e0b';
        robot.style.transform = 'rotate(90deg)';
        statusText.style.background = '#fffbeb';
        statusText.style.borderColor = '#fde68a';
        statusText.style.color = '#92400e';
        statusText.innerHTML = `🧱 <strong>Estat del robot:</strong> Ha detectat un obstacle davant. Gira a la dreta per esquivar-lo i continua la seva ruta.`;
        setTimeout(() => {
            if (robot) robot.style.transform = 'rotate(0deg)';
        }, 600);
    } else {
        robot.textContent = '🤖';
        robot.style.borderColor = '#10b981';
        robot.style.transform = 'translateY(-6px)';
        statusText.style.background = '#f0fdf4';
        statusText.style.borderColor = '#bbf7d0';
        statusText.style.color = '#166534';
        statusText.innerHTML = `✨ <strong>Estat del robot:</strong> Bateria correcta (${simRoombaBattery}%) i camí lliure. El robot avança netejant l'habitació.`;
        setTimeout(() => {
            if (robot) robot.style.transform = 'translateY(0)';
        }, 400);
    }
}

// Simulador Activitat 5: Semàfor Escolar Intel·ligent
let simTrafficTimer = 35;
let simTrafficState = 'cars_green';
let simTrafficTimeout = null;

function simTrafficReset() {
    if (simTrafficTimeout) clearTimeout(simTrafficTimeout);
    simTrafficTimer = 35;
    simTrafficState = 'cars_green';

    const timerBadge = document.getElementById('traffic-timer-badge');
    const statusText = document.getElementById('traffic-status-text');
    const btnCross = document.getElementById('btn-press-crosswalk');

    if (timerBadge) timerBadge.textContent = `⏱️ Temps Verd Cotxes: ${simTrafficTimer} s`;
    if (btnCross) btnCross.disabled = false;

    // Llums cotxes: Verd encès, Àmbre/Vermell apagats
    const carRed = document.getElementById('light-car-red');
    const carAmb = document.getElementById('light-car-amber');
    const carGrn = document.getElementById('light-car-green');
    if (carRed) { carRed.style.background = '#450a0a'; carRed.style.boxShadow = 'none'; }
    if (carAmb) { carAmb.style.background = '#451a03'; carAmb.style.boxShadow = 'none'; }
    if (carGrn) { carGrn.style.background = '#22c55e'; carGrn.style.boxShadow = '0 0 16px #22c55e'; }

    // Llums vianants: Vermell encès, Verd apagat
    const pedRed = document.getElementById('light-ped-red');
    const pedGrn = document.getElementById('light-ped-green');
    if (pedRed) { pedRed.style.background = '#ef4444'; pedRed.style.boxShadow = '0 0 16px #ef4444'; }
    if (pedGrn) { pedGrn.style.background = '#052e16'; pedGrn.style.boxShadow = 'none'; }

    if (statusText) {
        statusText.style.background = '#f8fafc';
        statusText.style.borderColor = '#e2e8f0';
        statusText.style.color = '#334155';
        statusText.innerHTML = `🟢 <strong>Cotxes en VERD:</strong> El trànsit circula de manera fluida. Prem el botó per demanar pas per als alumnes!`;
    }
}

function simTrafficPressButton() {
    if (simTrafficState !== 'cars_green') return;

    const timerBadge = document.getElementById('traffic-timer-badge');
    const statusText = document.getElementById('traffic-status-text');
    const btnCross = document.getElementById('btn-press-crosswalk');
    const carRed = document.getElementById('light-car-red');
    const carAmb = document.getElementById('light-car-amber');
    const carGrn = document.getElementById('light-car-green');
    const pedRed = document.getElementById('light-ped-red');
    const pedGrn = document.getElementById('light-ped-green');

    if (simTrafficTimer < 30) {
        if (statusText) {
            statusText.style.background = '#fffbeb';
            statusText.style.borderColor = '#fde68a';
            statusText.style.color = '#92400e';
            statusText.innerHTML = `⏳ <strong>Decisió 1: Polsador SÍ → Decisió 2: Han passat &gt;30s? NO (${simTrafficTimer}s)</strong> → Acció: <em>Espera 5 segons de seguretat</em> abans de tallar el trànsit escolar per no generar embussos!`;
        }
        simTrafficTimer += 5;
        if (timerBadge) timerBadge.textContent = `⏱️ Temps Verd Cotxes: ${simTrafficTimer} s`;
        return;
    }

    if (btnCross) btnCross.disabled = true;
    simTrafficState = 'cars_amber';

    // Fase 1: Cotxes en Àmbre (3 segons)
    if (carGrn) { carGrn.style.background = '#052e16'; carGrn.style.boxShadow = 'none'; }
    if (carAmb) { carAmb.style.background = '#f59e0b'; carAmb.style.boxShadow = '0 0 18px #f59e0b'; }
    if (statusText) {
        statusText.style.background = '#fffbeb';
        statusText.style.borderColor = '#fde68a';
        statusText.style.color = '#92400e';
        statusText.innerHTML = `⚠️ <strong>Decisió 1: Polsador SÍ → Decisió 2: &gt;30s? SÍ</strong> → Acció 1: <em>Posa cotxes en ÀMBRE durant 3 segons</em> per avisar els vehicles que han de frenar!`;
    }

    // Fase 2: Cotxes Vermell + Vianants Verd (15 segons de pas segur)
    simTrafficTimeout = setTimeout(() => {
        simTrafficState = 'pedestrians_green';
        if (carAmb) { carAmb.style.background = '#451a03'; carAmb.style.boxShadow = 'none'; }
        if (carRed) { carRed.style.background = '#ef4444'; carRed.style.boxShadow = '0 0 18px #ef4444'; }
        if (pedRed) { pedRed.style.background = '#450a0a'; pedRed.style.boxShadow = 'none'; }
        if (pedGrn) { pedGrn.style.background = '#22c55e'; pedGrn.style.boxShadow = '0 0 20px #22c55e'; }

        if (statusText) {
            statusText.style.background = '#eff6ff';
            statusText.style.borderColor = '#bfdbfe';
            statusText.style.color = '#1e40af';
            statusText.innerHTML = `🚶‍♂️ <strong>Acció 2: Posa cotxes en VERMELL i vianants en VERD amb senyal acústic 🔊</strong> → Acció 3: <em>Espera 15 segons de pas segur</em> per creuar el carrer de l'escola!`;
        }

        // Fase 3: Retorn al bucle continu
        simTrafficTimeout = setTimeout(() => {
            simTrafficReset();
            if (statusText) {
                statusText.style.background = '#f0fdf4';
                statusText.style.borderColor = '#bbf7d0';
                statusText.style.color = '#166534';
                statusText.innerHTML = `🔄 <strong>Retorn al bucle de trànsit ↺</strong>: Els cotxes tornen a tenir el VERD i el semàfor continua vigilant la seguretat dels alumnes.`;
            }
        }, 5000); // 5s demo visual
    }, 2500);
}



// ============================================================================
// SIMULADOR ACTIVITAT 6: LA BARRERA DEL PÀRQUING INTEL·LIGENT
// ============================================================================
let simParkingState = {
    carAtGate: true,
    freeSpaces: 3,
    carPassed: true,
    barrierOpen: false,
    light: 'red'
};

function updateParkingSimUI() {
    const btnCarYes = document.getElementById('btn-park-car-yes');
    const btnCarNo = document.getElementById('btn-park-car-no');
    const btnSp3 = document.getElementById('btn-park-spaces-3');
    const btnSp0 = document.getElementById('btn-park-spaces-0');
    const btnPassYes = document.getElementById('btn-park-passed-yes');
    const btnPassNo = document.getElementById('btn-park-passed-no');

    if (btnCarYes && btnCarNo) {
        if (simParkingState.carAtGate) {
            btnCarYes.style.background = '#2563eb';
            btnCarYes.style.color = '#ffffff';
            btnCarNo.style.background = 'transparent';
            btnCarNo.style.color = '#2563eb';
        } else {
            btnCarYes.style.background = 'transparent';
            btnCarYes.style.color = '#2563eb';
            btnCarNo.style.background = '#2563eb';
            btnCarNo.style.color = '#ffffff';
        }
    }
    if (btnSp3 && btnSp0) {
        if (simParkingState.freeSpaces > 0) {
            btnSp3.style.background = '#16a34a';
            btnSp3.style.color = '#ffffff';
            btnSp0.style.background = 'transparent';
            btnSp0.style.color = '#dc2626';
        } else {
            btnSp3.style.background = 'transparent';
            btnSp3.style.color = '#16a34a';
            btnSp0.style.background = '#dc2626';
            btnSp0.style.color = '#ffffff';
        }
    }
    if (btnPassYes && btnPassNo) {
        if (simParkingState.carPassed) {
            btnPassYes.style.background = '#2563eb';
            btnPassYes.style.color = '#ffffff';
            btnPassNo.style.background = 'transparent';
            btnPassNo.style.color = '#2563eb';
        } else {
            btnPassYes.style.background = 'transparent';
            btnPassYes.style.color = '#2563eb';
            btnPassNo.style.background = '#2563eb';
            btnPassNo.style.color = '#ffffff';
        }
    }

    const carEl = document.getElementById('parking-sim-car');
    const armEl = document.getElementById('parking-sim-barrier-arm');
    const lightEl = document.getElementById('parking-sim-light-indicator');
    const screenEl = document.getElementById('parking-sim-screen');

    if (carEl) {
        carEl.style.opacity = simParkingState.carAtGate ? '1' : '0.2';
        carEl.style.transform = simParkingState.carAtGate ? (simParkingState.barrierOpen && simParkingState.carPassed ? 'translateX(160px)' : 'translateX(0)') : 'translateX(-80px)';
    }

    if (armEl) {
        armEl.style.transform = simParkingState.barrierOpen ? 'rotate(-75deg)' : 'rotate(0deg)';
    }

    if (lightEl) {
        if (simParkingState.light === 'green') {
            lightEl.style.background = '#22c55e';
            lightEl.style.boxShadow = '0 0 12px #22c55e';
        } else {
            lightEl.style.background = '#ef4444';
            lightEl.style.boxShadow = '0 0 12px #ef4444';
        }
    }

    if (screenEl) {
        if (simParkingState.freeSpaces === 0) {
            screenEl.textContent = 'COMPLET 🚫';
            screenEl.style.color = '#ef4444';
            screenEl.style.borderColor = '#ef4444';
        } else {
            screenEl.textContent = `LLIURE (${simParkingState.freeSpaces} PLACES)`;
            screenEl.style.color = '#22c55e';
            screenEl.style.borderColor = '#22c55e';
        }
    }
}

function setParkingCarAtGate(hasCar) {
    simParkingState.carAtGate = hasCar;
    simParkingState.barrierOpen = false;
    simParkingState.light = 'red';
    updateParkingSimUI();
}

function setParkingSpaces(spaces) {
    simParkingState.freeSpaces = spaces;
    updateParkingSimUI();
}

function setParkingCarPassed(passed) {
    simParkingState.carPassed = passed;
    updateParkingSimUI();
}

function resetParkingSim() {
    simParkingState = {
        carAtGate: true,
        freeSpaces: 3,
        carPassed: true,
        barrierOpen: false,
        light: 'red'
    };
    updateParkingSimUI();
    const logEl = document.getElementById('parking-sim-log');
    if (logEl) {
        logEl.style.background = '#000000';
        logEl.style.color = '#a7f3d0';
        logEl.style.borderColor = '#334155';
        logEl.innerHTML = `💡 Tria els sensors i prem «▶️ Executar Cicle de la Barrera» per veure les decisions del controlador!`;
    }
}

function runParkingSimulation() {
    const logEl = document.getElementById('parking-sim-log');

    // Pas 1: Rombe Sensor de presència
    if (!simParkingState.carAtGate) {
        simParkingState.barrierOpen = false;
        simParkingState.light = 'red';
        updateParkingSimUI();
        if (logEl) {
            logEl.style.background = '#0f172a';
            logEl.style.color = '#94a3b8';
            logEl.style.borderColor = '#475569';
            logEl.innerHTML = `🛑 <strong>Decisió 1 (Sensor d'entrada): Detecta vehicle? NO</strong><br>➔ Acció: <em>Mantenir la barrera baixada (Repòs)</em>. El sistema continua vigilant l'accés ↺.`;
        }
        return;
    }

    // Pas 2: Rombe Comprovació d'aforament
    if (simParkingState.freeSpaces <= 0) {
        simParkingState.barrierOpen = false;
        simParkingState.light = 'red';
        updateParkingSimUI();
        if (logEl) {
            logEl.style.background = '#450a0a';
            logEl.style.color = '#fca5a5';
            logEl.style.borderColor = '#ef4444';
            logEl.innerHTML = `⚠️ <strong>Decisió 1: Detecta vehicle? SÍ</strong> ➔ <strong>Decisió 2: Places lliures? NO (Pàrquing complet!)</strong><br>➔ Acció: <em>Encendre llum vermella i senyal "COMPLET"</em>. La barrera no s'aixeca per no sobrecarregar l'aparcament.`;
        }
        return;
    }

    // Pas 3: Places > 0 -> Obrir barrera
    simParkingState.barrierOpen = true;
    simParkingState.light = 'green';
    updateParkingSimUI();
    if (logEl) {
        logEl.style.background = '#064e3b';
        logEl.style.color = '#a7f3d0';
        logEl.style.borderColor = '#10b981';
        logEl.innerHTML = `🟢 <strong>Decisió 1: Detecta vehicle? SÍ</strong> ➔ <strong>Decisió 2: Places lliures? SÍ (${simParkingState.freeSpaces} lliures)</strong><br>➔ Acció: <em>Aixecar la barrera i encendre llum verda</em>. El cotxe té autorització per entrar!`;
    }

    // Pas 4: Rombe Fotocèl·lula de pas segur
    setTimeout(() => {
        if (!simParkingState.carPassed) {
            if (logEl) {
                logEl.innerHTML += `<br>⏳ <strong>Decisió 3: El vehicle ha travessat la barrera? NO</strong> ➔ La fotocèl·lula manté la barrera aixecada per seguretat antixafament!`;
            }
        } else {
            simParkingState.barrierOpen = false;
            simParkingState.light = 'red';
            simParkingState.freeSpaces = Math.max(0, simParkingState.freeSpaces - 1);
            updateParkingSimUI();
            if (logEl) {
                logEl.innerHTML += `<br>🚗💨 <strong>Decisió 3: El vehicle ha travessat la barrera? SÍ</strong><br>➔ Acció: <em>Baixar la barrera i restar 1 plaça lliure</em>. Queden ${simParkingState.freeSpaces} places disponibles. Retorn al bucle de vigilància ↺!`;
            }
        }
    }, 1200);
}

function drawAct6Loop() {
    const board = document.getElementById('act6-board-inner');
    const svgEl = document.getElementById('act6-loop-svg');
    const svgG = document.getElementById('act6-loop-paths');
    const target = document.getElementById('act6-loop-target');
    const s2 = document.getElementById('slot-act6-2');
    const s3 = document.getElementById('slot-act6-3');
    const s4 = document.getElementById('slot-act6-4');
    const s7 = document.getElementById('slot-act6-7');
    if (!board || !svgEl || !svgG || !target || !s2 || !s3 || !s4 || !s7) return;
    if (board.offsetParent === null) return;

    const bRect = board.getBoundingClientRect();
    if (bRect.width === 0 || bRect.height === 0) return;

    svgEl.setAttribute('viewBox', `0 0 ${bRect.width} ${bRect.height}`);

    const tRect = target.getBoundingClientRect();
    const r2 = s2.getBoundingClientRect();
    const r3 = s3.getBoundingClientRect();
    const r4 = s4.getBoundingClientRect();
    const r7 = s7.getBoundingClientRect();

    const targetLeftX = tRect.left - bRect.left;
    const targetRightX = tRect.right - bRect.left;
    const targetY = tRect.top - bRect.top + (tRect.height / 2);

    // 1. Branca esquerra (Sense cotxe -> Barrera baixada -> Torna a vigilar)
    const s2MidX = r2.left - bRect.left + (r2.width / 2);
    const s2BotY = r2.bottom - bRect.top;
    const leftBottomY = s2BotY + 24;
    const leftGutterX = 18;

    // 2. Branca dreta final (Cotxe ha entrat -> Baixar barrera -> Esperar nou cotxe)
    const s7MidX = r7.left - bRect.left + (r7.width / 2);
    const s7BotY = r7.bottom - bRect.top;
    const rightBottomY = s7BotY + 24;
    const rightGutterX = bRect.width - 18;

    const leftBranchPaths = `M ${s2MidX} ${s2BotY} L ${s2MidX} ${leftBottomY} L ${leftGutterX} ${leftBottomY} L ${leftGutterX} ${targetY} L ${targetLeftX} ${targetY}`;
    const rightBranchPaths = `M ${s7MidX} ${s7BotY} L ${s7MidX} ${rightBottomY} L ${rightGutterX} ${rightBottomY} L ${rightGutterX} ${targetY} L ${targetRightX} ${targetY}`;

    const midYLeft = (leftBottomY + targetY) / 2;
    const midYRight = (rightBottomY + targetY) / 2;

    // 3. Branca Reintenta Aforament (s4 COMPLET -> Torna al rombe s3 "Queden places lliures?")
    const s4MidX = r4.left - bRect.left + (r4.width / 2);
    const s4BotY = r4.bottom - bRect.top;
    const s4LoopBottomY = s4BotY + 16;
    const s4LoopLeftX = (r4.left - bRect.left) - 12;
    const s3LeftX = r3.left - bRect.left;
    const s3MidY = r3.top - bRect.top + (r3.height / 2);

    const s4RetryPath = `M ${s4MidX} ${s4BotY} L ${s4MidX} ${s4LoopBottomY} L ${s4LoopLeftX} ${s4LoopBottomY} L ${s4LoopLeftX} ${s3MidY} L ${s3LeftX} ${s3MidY}`;
    const midYRetry = (s4LoopBottomY + s3MidY) / 2;

    svgG.innerHTML = `
        <!-- Branca Esquerra Espera de Vehicle -->
        <path d="${leftBranchPaths}" fill="none" stroke="#64748b" stroke-width="3" stroke-dasharray="7,4" class="loop-active-path" marker-end="url(#marker-loop-blue-act6)"/>
        <rect x="${leftGutterX - 14}" y="${midYLeft - 80}" width="28" height="160" rx="6" fill="#ffffff" stroke="#64748b" stroke-width="2"/>
        <text x="${leftGutterX}" y="${midYLeft}" fill="#475569" font-family="'JetBrains Mono', monospace" font-size="10.5" font-weight="800" text-anchor="middle" dominant-baseline="central" transform="rotate(-90 ${leftGutterX},${midYLeft})">VIGILÀNCIA D'ENTRADA ↺</text>

        <!-- Branca Dreta Cicle Completat / Nou Vehicle -->
        <path d="${rightBranchPaths}" fill="none" stroke="#2563eb" stroke-width="3" stroke-dasharray="7,4" class="loop-active-path" marker-end="url(#marker-loop-blue-act6)" filter="url(#glow-blue-act6)"/>
        <rect x="${rightGutterX - 14}" y="${midYRight - 80}" width="28" height="160" rx="6" fill="#ffffff" stroke="#2563eb" stroke-width="2"/>
        <text x="${rightGutterX}" y="${midYRight}" fill="#1d4ed8" font-family="'JetBrains Mono', monospace" font-size="10.5" font-weight="800" text-anchor="middle" dominant-baseline="central" transform="rotate(90 ${rightGutterX},${midYRight})">NOU VEHICLE ↺</text>

        <!-- Branca Bucle COMPLET -> Reintenta places a "Queden places lliures?" -->
        <path d="${s4RetryPath}" fill="none" stroke="#dc2626" stroke-width="2.5" stroke-dasharray="6,3" class="loop-active-path" marker-end="url(#marker-loop-red-act6)"/>
        <rect x="${s4LoopLeftX - 11}" y="${midYRetry - 45}" width="22" height="90" rx="5" fill="#ffffff" stroke="#dc2626" stroke-width="1.8"/>
        <text x="${s4LoopLeftX}" y="${midYRetry}" fill="#b91c1c" font-family="'JetBrains Mono', monospace" font-size="8.5" font-weight="800" text-anchor="middle" dominant-baseline="central" transform="rotate(-90 ${s4LoopLeftX},${midYRetry})">REINTENTA PLACES ↺</text>
    `;
}

// ============================================================================
// FASE 7: DIPLOMA OFICIAL D'APROFITAMENT
// ============================================================================
function renderDiploma() {
    const nameEl = document.getElementById('dip-name');
    const groupEl = document.getElementById('dip-group');
    const xpEl = document.getElementById('dip-xp');
    const diagEl = document.getElementById('dip-diagram-count');
    const stagesEl = document.getElementById('dip-stages-count');

    if (nameEl) nameEl.textContent = appState.studentName || 'Nom i Cognoms';
    if (groupEl) groupEl.textContent = appState.studentGroup || 'ESO';
    if (xpEl) xpEl.textContent = `${appState.totalXP} / 1500 XP`;
    if (diagEl) diagEl.textContent = '9 de 9 (100%)';
    if (stagesEl) stagesEl.textContent = '11 de 11';

    const badge = document.getElementById('dip-level-badge');
    if (badge) {
        badge.textContent = 'Itinerari: 🔵 Pensament Algorísmic, Depuració i Enginyeria Inversa';
        badge.style.background = '#dbeafe';
        badge.style.color = '#1d4ed8';
        badge.style.borderColor = '#93c5fd';
    }

    const xp = appState.totalXP;
    const qualEl = document.getElementById('dip-qualification');
    if (qualEl) {
        if (xp >= 1350) {
            qualEl.textContent = 'Assoliment Excel·lent 🏆';
            qualEl.style.color = '#16a34a';
        } else if (xp >= 1150) {
            qualEl.textContent = 'Assoliment Notable 🎖️';
            qualEl.style.color = '#2563eb';
        } else if (xp >= 900) {
            qualEl.textContent = 'Assoliment Satisfactori 🥉';
            qualEl.style.color = '#d97706';
        } else {
            qualEl.textContent = 'En Procés de Consolidació ⚠️';
            qualEl.style.color = '#dc2626';
        }
    }

    const strengths = [];
    const weaknesses = [];

    const p1 = (appState.penalties && appState.penalties.stage1) || 0;
    const p2 = (appState.penalties && appState.penalties.stage2) || 0;
    const p3 = (appState.penalties && appState.penalties.stage3) || 0;
    const p4 = (appState.penalties && appState.penalties.stage4) || 0;
    const p5 = (appState.penalties && appState.penalties.stage5) || 0;
    const p6 = (appState.penalties && appState.penalties.stage6) || 0;
    const p7 = (appState.penalties && appState.penalties.stage7) || 0;
    const p8 = (appState.penalties && appState.penalties.stage8) || 0;

    if (p1 === 0 && p2 === 0) {
        strengths.push("🧠 <strong>Pensament Algorísmic i Tipus de Blocs:</strong> Distinció impecable entre llenguatge natural i algorísmic, així com entre blocs d'acció (rectangles) i de decisió (rombes).");
    } else {
        weaknesses.push("🔷 <strong>Geometria dels Blocs:</strong> Recorda sempre que les preguntes de Sí/No van dins d'un rombe (decisió) i les ordres directes dins d'un rectangle (acció).");
    }

    if (p3 === 0) {
        strengths.push("⏰ <strong>Domini de Bucles Simples (El Despertador):</strong> Excel·lent comprensió de com una condició afirmativa pot retornar el flux a l'inici formant un cicle.");
    } else {
        weaknesses.push("⏰ <strong>Seqüència del Despertador:</strong> Repassa l'ordre de comprovació (primer sona el despertador, després decidim si dormim 10 minuts més o l'aturem).");
    }

    if (p4 === 0) {
        strengths.push("🐦 <strong>Depuració Robòtica (L'Ocellet en la Gàbia):</strong> Capacitat destacada per corregir diagrames oberts incomplets i transformar-los en bucles tancats amb doble comprovació.");
    } else {
        weaknesses.push("🐦 <strong>Control d'Estat en Robots:</strong> En sistemes com el paraigües de l'ocellet, cal comprovar tant el sensor extern (plou?) com l'estat de l'actuador (està obert?) dins d'un bucle continu.");
    }

    if (p5 === 0) {
        strengths.push("💡 <strong>Automatització i Estalvi Energètic (La Làmpada):</strong> Disseny òptim del cercle lògic amb doble sensor (llum natural + presència humana).");
    } else {
        weaknesses.push("💡 <strong>Condicions Múltiples (Làmpada Automàtica):</strong> Recorda comprovar tots dos sensors abans d'actuar per encendre la llum només quan és fosc i hi ha persones a l'aula.");
    }

    if (p6 === 0) {
        strengths.push("🤖 <strong>Robòtica Intel·ligent (Robot Aspirador Roomba):</strong> Gran domini de condicions niades (prioritat de bateria abans dels sensors d'obstacles) i retorn en bucle continu.");
    } else {
        weaknesses.push("🤖 <strong>Jerarquia de Decisions (Robot Aspirador):</strong> Recorda que la seguretat energètica (bateria) sempre s'ha de comprovar abans d'iniciar les maniobres d'evitació d'obstacles.");
    }

    if (p7 === 0) {
        strengths.push("🚦 <strong>Sistemes de Trànsit i Seguretat (Semàfor Escolar):</strong> Implementació impecable del control temporal de flux, demanda de vianants i transició de fases.");
    } else {
        weaknesses.push("🚦 <strong>Temporitzadors de Trànsit (Semàfor Intel·ligent):</strong> Repassa la seqüència: comprovar polsador, validar temps mínim de seguretat (>30 s) i executar la transició d'ambre a vermell.");
    }

    if (p8 === 0) {
        strengths.push("🚗 <strong>Control d'Accés i Aforament (La Barrera del Pàrquing):</strong> Programació excel·lent del sistema de barrera intel·ligent amb gestió de places, sensor d'entrada i fotocèl·lula de seguretat.");
    } else {
        weaknesses.push("🚗 <strong>Control de Pàrquing:</strong> Assegura't de comprovar l'aforament abans d'aixecar la barrera i utilitzar la fotocèl·lula per no baixar-la fins que el vehicle hagi passat completament.");
    }

    const strEl = document.getElementById('dip-strengths-list');
    const wkEl = document.getElementById('dip-weaknesses-list');

    if (strEl) {
        strEl.innerHTML = (strengths.length > 0 ? strengths : ["✅ Has completat totes les activitats pràctiques de construcció de diagrames de flux."])
            .map(s => `<li style="margin-bottom:0.4rem;">${s}</li>`).join('');
    }
    if (wkEl) {
        wkEl.innerHTML = (weaknesses.length > 0 ? weaknesses : ["✨ Rendiment excel·lent en totes les fases! Continua aplicant el pensament algorísmic als teus projectes de robòtica i programació."])
            .map(w => `<li style="margin-bottom:0.4rem;">${w}</li>`).join('');
    }

    const today = new Date();
    const dateEl = document.getElementById('dip-date');
    if (dateEl) {
        dateEl.textContent = today.toLocaleDateString('ca-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    }
}

function downloadDiplomaImage() {
    const el = document.getElementById('printable-diploma');
    if (!el || typeof html2canvas === 'undefined') {
        window.print();
        return;
    }

    const btn = document.getElementById('btn-download-img');
    const orig = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳ Generant imatge PNG...';
    }

    html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
        .then(canvas => {
            const link = document.createElement('a');
            const cleanName = (appState.studentName || 'alumne').toLowerCase().replace(/[^a-z0-9àèéíòóúçñ]+/gi, '_');
            link.download = `diploma_robots_diagrames_${cleanName}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        })
        .catch(() => window.print())
        .finally(() => {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = orig;
            }
        });
}

// ============================================================================
// DIBUIXAT DINÀMIC I EXACTE DE LES FLETXES DE RETORN DELS BUCLES (SVG)
// ============================================================================
function drawAct1Loop() {
    const board = document.getElementById('act1-board-inner');
    const svgEl = document.getElementById('act1-loop-svg');
    const svgG = document.getElementById('act1-loop-paths');
    const slot3 = document.getElementById('slot-act1-3');
    const slot1 = document.getElementById('slot-act1-1');
    if (!board || !svgEl || !svgG || !slot3 || !slot1) return;
    if (board.offsetParent === null) return; // Si la fase està oculta no dibuixem

    const bRect = board.getBoundingClientRect();
    if (bRect.width === 0 || bRect.height === 0) return;

    svgEl.setAttribute('viewBox', `0 0 ${bRect.width} ${bRect.height}`);

    const s3Rect = slot3.getBoundingClientRect();
    const s1Rect = slot1.getBoundingClientRect();

    const startX = s3Rect.left - bRect.left + (s3Rect.width / 2);
    const startY = s3Rect.bottom - bRect.top;
    const targetX = s1Rect.left - bRect.left;
    const targetY = s1Rect.top - bRect.top + (s1Rect.height / 2);

    const bottomY = startY + 28;
    const leftX = 20;

    const pathData = `M ${startX} ${startY} L ${startX} ${bottomY} L ${leftX} ${bottomY} L ${leftX} ${targetY} L ${targetX} ${targetY}`;
    const midY = (bottomY + targetY) / 2;

    svgG.innerHTML = `
        <!-- Fletxa de bucle de retorn connectada directament a Sona el despertador -->
        <path d="${pathData}" fill="none" stroke="#10b981" stroke-width="3.5" stroke-dasharray="8,5" class="loop-active-path" marker-end="url(#marker-loop-act1)" filter="url(#glow-green-act1)"/>
        <!-- Etiqueta sobre la fletxa de retorn -->
        <rect x="${leftX - 14}" y="${midY - 90}" width="28" height="180" rx="6" fill="#ffffff" stroke="#10b981" stroke-width="2"/>
        <text x="${leftX}" y="${midY}" fill="#047857" font-family="'JetBrains Mono', monospace" font-size="10.5" font-weight="800" text-anchor="middle" dominant-baseline="central" transform="rotate(-90 ${leftX},${midY})">BUCLE DE RETORN (+10 min) ↺</text>
    `;
}

function drawAct2Loop() {
    const board = document.getElementById('act2-board-inner');
    const svgEl = document.getElementById('act2-loop-svg');
    const svgG = document.getElementById('act2-loop-paths');
    const target = document.getElementById('act2-loop-target');
    const s4 = document.getElementById('slot-act2-4');
    const s5 = document.getElementById('slot-act2-5');
    const s6 = document.getElementById('slot-act2-6');
    const sFixed = document.getElementById('act2-fixed-closed');
    if (!board || !svgEl || !svgG || !target || !s4 || !s5 || !s6 || !sFixed) return;
    if (board.offsetParent === null) return;

    const bRect = board.getBoundingClientRect();
    if (bRect.width === 0 || bRect.height === 0) return;

    svgEl.setAttribute('viewBox', `0 0 ${bRect.width} ${bRect.height}`);

    const tRect = target.getBoundingClientRect();
    const r4 = s4.getBoundingClientRect();
    const r5 = s5.getBoundingClientRect();
    const r6 = s6.getBoundingClientRect();
    const rF = sFixed.getBoundingClientRect();

    const targetLeftX = tRect.left - bRect.left;
    const targetRightX = tRect.right - bRect.left;
    const targetY = tRect.top - bRect.top + (tRect.height / 2);

    // Branca esquerra (Plou): s4 (Obrir) & s5 (Mantenir obert)
    const s4MidX = r4.left - bRect.left + (r4.width / 2);
    const s4BotY = r4.bottom - bRect.top;
    const s5MidX = r5.left - bRect.left + (r5.width / 2);
    const s5BotY = r5.bottom - bRect.top;

    const leftBottomY = Math.max(s4BotY, s5BotY) + 26;
    const leftGutterX = 20;

    // Branca dreta (Sol): s6 (Tancar) & sFixed (Mantenir tancat)
    const s6MidX = r6.left - bRect.left + (r6.width / 2);
    const s6BotY = r6.bottom - bRect.top;
    const rFMidX = rF.left - bRect.left + (rF.width / 2);
    const rFBotY = rF.bottom - bRect.top;

    const rightBottomY = Math.max(s6BotY, rFBotY) + 26;
    const rightGutterX = bRect.width - 20;

    const leftBranchPaths = `M ${s5MidX} ${s5BotY} L ${s5MidX} ${leftBottomY} M ${s4MidX} ${s4BotY} L ${s4MidX} ${leftBottomY} L ${leftGutterX} ${leftBottomY} L ${leftGutterX} ${targetY} L ${targetLeftX} ${targetY}`;
    const rightBranchPaths = `M ${s6MidX} ${s6BotY} L ${s6MidX} ${rightBottomY} M ${rFMidX} ${rFBotY} L ${rFMidX} ${rightBottomY} L ${rightGutterX} ${rightBottomY} L ${rightGutterX} ${targetY} L ${targetRightX} ${targetY}`;

    const midYLeft = (leftBottomY + targetY) / 2;
    const midYRight = (rightBottomY + targetY) / 2;

    svgG.innerHTML = `
        <!-- Branca Esquerra (Plou) que retorna al Punt de Control Continu -->
        <path d="${leftBranchPaths}" fill="none" stroke="#0284c7" stroke-width="3" stroke-dasharray="7,4" class="loop-active-path" marker-end="url(#marker-loop-cyan)"/>
        <rect x="${leftGutterX - 14}" y="${midYLeft - 85}" width="28" height="170" rx="6" fill="#ffffff" stroke="#0284c7" stroke-width="2"/>
        <text x="${leftGutterX}" y="${midYLeft}" fill="#0369a1" font-family="'JetBrains Mono', monospace" font-size="10.5" font-weight="800" text-anchor="middle" dominant-baseline="central" transform="rotate(-90 ${leftGutterX},${midYLeft})">BUCLE DE VIGILÀNCIA ↺</text>

        <!-- Branca Dreta (Sol) que retorna al Punt de Control Continu -->
        <path d="${rightBranchPaths}" fill="none" stroke="#f59e0b" stroke-width="3" stroke-dasharray="7,4" class="loop-active-path" marker-end="url(#marker-loop-amber-left)"/>
        <rect x="${rightGutterX - 14}" y="${midYRight - 85}" width="28" height="170" rx="6" fill="#ffffff" stroke="#f59e0b" stroke-width="2"/>
        <text x="${rightGutterX}" y="${midYRight}" fill="#b45309" font-family="'JetBrains Mono', monospace" font-size="10.5" font-weight="800" text-anchor="middle" dominant-baseline="central" transform="rotate(90 ${rightGutterX},${midYRight})">BUCLE DE VIGILÀNCIA ↺</text>
    `;
}

function drawAct3Loop() {
    const board = document.getElementById('act3-board-inner');
    const svgEl = document.getElementById('act3-loop-svg');
    const svgG = document.getElementById('act3-loop-paths');
    const target = document.getElementById('act3-loop-target');
    const s3 = document.getElementById('slot-act3-3');
    const s4 = document.getElementById('slot-act3-4');
    const s5 = document.getElementById('slot-act3-5');
    if (!board || !svgEl || !svgG || !target || !s3 || !s4 || !s5) return;
    if (board.offsetParent === null) return;

    const bRect = board.getBoundingClientRect();
    if (bRect.width === 0 || bRect.height === 0) return;

    svgEl.setAttribute('viewBox', `0 0 ${bRect.width} ${bRect.height}`);

    const tRect = target.getBoundingClientRect();
    const r3 = s3.getBoundingClientRect();
    const r4 = s4.getBoundingClientRect();
    const r5 = s5.getBoundingClientRect();

    const targetLeftX = tRect.left - bRect.left;
    const targetRightX = tRect.right - bRect.left;
    const targetY = tRect.top - bRect.top + (tRect.height / 2);

    // Branca esquerra (Foscor): s3 (Encendre) & s4 (Apagar)
    const s3MidX = r3.left - bRect.left + (r3.width / 2);
    const s3BotY = r3.bottom - bRect.top;
    const s4MidX = r4.left - bRect.left + (r4.width / 2);
    const s4BotY = r4.bottom - bRect.top;

    const leftBottomY = Math.max(s3BotY, s4BotY) + 26;
    const leftGutterX = 20;

    // Branca dreta (Llum de dia): s5 (Apagar)
    const s5MidX = r5.left - bRect.left + (r5.width / 2);
    const s5BotY = r5.bottom - bRect.top;

    const rightBottomY = s5BotY + 26;
    const rightGutterX = bRect.width - 20;

    const leftBranchPaths = `M ${s3MidX} ${s3BotY} L ${s3MidX} ${leftBottomY} M ${s4MidX} ${s4BotY} L ${s4MidX} ${leftBottomY} L ${leftGutterX} ${leftBottomY} L ${leftGutterX} ${targetY} L ${targetLeftX} ${targetY}`;
    const rightBranchPaths = `M ${s5MidX} ${s5BotY} L ${s5MidX} ${rightBottomY} L ${rightGutterX} ${rightBottomY} L ${rightGutterX} ${targetY} L ${targetRightX} ${targetY}`;

    const midYLeft = (leftBottomY + targetY) / 2;
    const midYRight = (rightBottomY + targetY) / 2;

    svgG.innerHTML = `
        <!-- Branca Foscor que retorna al Cicle Domòtic -->
        <path d="${leftBranchPaths}" fill="none" stroke="#0284c7" stroke-width="3" stroke-dasharray="7,4" class="loop-active-path" marker-end="url(#marker-loop-cyan-act3)"/>
        <rect x="${leftGutterX - 14}" y="${midYLeft - 100}" width="28" height="200" rx="6" fill="#ffffff" stroke="#0284c7" stroke-width="2"/>
        <text x="${leftGutterX}" y="${midYLeft}" fill="#0369a1" font-family="'JetBrains Mono', monospace" font-size="10.5" font-weight="800" text-anchor="middle" dominant-baseline="central" transform="rotate(-90 ${leftGutterX},${midYLeft})">RETORN AL CICLE DOMÒTIC ↺</text>

        <!-- Branca Llum de Dia que retorna al Cicle Domòtic -->
        <path d="${rightBranchPaths}" fill="none" stroke="#f59e0b" stroke-width="3" stroke-dasharray="7,4" class="loop-active-path" marker-end="url(#marker-loop-amber-act3)"/>
        <rect x="${rightGutterX - 14}" y="${midYRight - 100}" width="28" height="200" rx="6" fill="#ffffff" stroke="#f59e0b" stroke-width="2"/>
        <text x="${rightGutterX}" y="${midYRight}" fill="#b45309" font-family="'JetBrains Mono', monospace" font-size="10.5" font-weight="800" text-anchor="middle" dominant-baseline="central" transform="rotate(90 ${rightGutterX},${midYRight})">RETORN AL CICLE DOMÒTIC ↺</text>
    `;
}

function drawAct4Loop() {
    const board = document.getElementById('act4-board-inner');
    const svgEl = document.getElementById('act4-loop-svg');
    const svgG = document.getElementById('act4-loop-paths');
    const target = document.getElementById('act4-loop-target');
    const s3 = document.getElementById('slot-act4-3');
    const s4 = document.getElementById('slot-act4-4');
    if (!board || !svgEl || !svgG || !target || !s3 || !s4) return;
    if (board.offsetParent === null) return;

    const bRect = board.getBoundingClientRect();
    if (bRect.width === 0 || bRect.height === 0) return;

    svgEl.setAttribute('viewBox', `0 0 ${bRect.width} ${bRect.height}`);

    const tRect = target.getBoundingClientRect();
    const r3 = s3.getBoundingClientRect();
    const r4 = s4.getBoundingClientRect();

    const targetLeftX = tRect.left - bRect.left;
    const targetY = tRect.top - bRect.top + (tRect.height / 2);

    const s3MidX = r3.left - bRect.left + (r3.width / 2);
    const s3BotY = r3.bottom - bRect.top;
    const s4MidX = r4.left - bRect.left + (r4.width / 2);
    const s4BotY = r4.bottom - bRect.top;

    const bottomY = Math.max(s3BotY, s4BotY) + 26;
    const leftGutterX = 20;

    const pathData = `M ${s3MidX} ${s3BotY} L ${s3MidX} ${bottomY} M ${s4MidX} ${s4BotY} L ${s4MidX} ${bottomY} L ${leftGutterX} ${bottomY} L ${leftGutterX} ${targetY} L ${targetLeftX} ${targetY}`;
    const midY = (bottomY + targetY) / 2;

    svgG.innerHTML = `
        <!-- Bucle de Neteja Continu del Robot Aspirador -->
        <path d="${pathData}" fill="none" stroke="#8b5cf6" stroke-width="3" stroke-dasharray="7,4" class="loop-active-path" marker-end="url(#marker-loop-purple-act4)" filter="url(#glow-purple-act4)"/>
        <rect x="${leftGutterX - 14}" y="${midY - 80}" width="28" height="160" rx="6" fill="#ffffff" stroke="#8b5cf6" stroke-width="2"/>
        <text x="${leftGutterX}" y="${midY}" fill="#7c3aed" font-family="'JetBrains Mono', monospace" font-size="10.5" font-weight="800" text-anchor="middle" dominant-baseline="central" transform="rotate(-90 ${leftGutterX},${midY})">BUCLE DE NETEJA ↺</text>
    `;
}

function drawAct5Loop() {
    const board = document.getElementById('act5-board-inner');
    const svgEl = document.getElementById('act5-loop-svg');
    const svgG = document.getElementById('act5-loop-paths');
    const target = document.getElementById('act5-loop-target');
    const s2 = document.getElementById('slot-act5-2');
    const s3 = document.getElementById('slot-act5-3');
    const s4 = document.getElementById('slot-act5-4');
    const s7 = document.getElementById('slot-act5-7');
    if (!board || !svgEl || !svgG || !target || !s2 || !s3 || !s4 || !s7) return;
    if (board.offsetParent === null) return;

    const bRect = board.getBoundingClientRect();
    if (bRect.width === 0 || bRect.height === 0) return;

    svgEl.setAttribute('viewBox', `0 0 ${bRect.width} ${bRect.height}`);

    const tRect = target.getBoundingClientRect();
    const r2 = s2.getBoundingClientRect();
    const r3 = s3.getBoundingClientRect();
    const r4 = s4.getBoundingClientRect();
    const r7 = s7.getBoundingClientRect();

    const targetLeftX = tRect.left - bRect.left;
    const targetRightX = tRect.right - bRect.left;
    const targetY = tRect.top - bRect.top + (tRect.height / 2);

    // Branca esquerra (Cotxes continuen verd - NO demanda)
    const s2MidX = r2.left - bRect.left + (r2.width / 2);
    const s2BotY = r2.bottom - bRect.top;
    const leftBottomY = s2BotY + 26;
    const leftGutterX = 20;

    // Branca dreta (Cicle de pas escolar completat)
    const s7MidX = r7.left - bRect.left + (r7.width / 2);
    const s7BotY = r7.bottom - bRect.top;
    const rightBottomY = s7BotY + 26;
    const rightGutterX = bRect.width - 20;

    // Bucle intern de seguretat: Després d'«Esperar 5 s» (s4), fletxa directa a «Han passat > 30 s de cotxes en verd?» (s3)
    const s4MidX = r4.left - bRect.left + (r4.width / 2);
    const s4BotY = r4.bottom - bRect.top;
    const s3LeftX = r3.left - bRect.left;
    const s3MidY = r3.top - bRect.top + (r3.height / 2);
    const s4LoopBottomY = s4BotY + 16;
    const s4LoopLeftX = (r4.left - bRect.left) - 16;

    const s4ToS3LoopPath = `M ${s4MidX} ${s4BotY} L ${s4MidX} ${s4LoopBottomY} L ${s4LoopLeftX} ${s4LoopBottomY} L ${s4LoopLeftX} ${s3MidY} L ${s3LeftX} ${s3MidY}`;

    const leftBranchPaths = `M ${s2MidX} ${s2BotY} L ${s2MidX} ${leftBottomY} L ${leftGutterX} ${leftBottomY} L ${leftGutterX} ${targetY} L ${targetLeftX} ${targetY}`;
    const rightBranchPaths = `M ${s7MidX} ${s7BotY} L ${s7MidX} ${rightBottomY} L ${rightGutterX} ${rightBottomY} L ${rightGutterX} ${targetY} L ${targetRightX} ${targetY}`;

    const midYLeft = (leftBottomY + targetY) / 2;
    const midYRight = (rightBottomY + targetY) / 2;
    const midYTimerLoop = (s4LoopBottomY + s3MidY) / 2;

    svgG.innerHTML = `
        <!-- Branca Esquerra Trànsit Fluid -->
        <path d="${leftBranchPaths}" fill="none" stroke="#64748b" stroke-width="3" stroke-dasharray="7,4" class="loop-active-path" marker-end="url(#marker-loop-blue-act5)"/>
        <rect x="${leftGutterX - 14}" y="${midYLeft - 80}" width="28" height="160" rx="6" fill="#ffffff" stroke="#64748b" stroke-width="2"/>
        <text x="${leftGutterX}" y="${midYLeft}" fill="#475569" font-family="'JetBrains Mono', monospace" font-size="10.5" font-weight="800" text-anchor="middle" dominant-baseline="central" transform="rotate(-90 ${leftGutterX},${midYLeft})">TRÀNSIT CONTINU ↺</text>

        <!-- Bucle de Seguretat de s4 (Esperar 5s) a s3 (Han passat > 30 s?) -->
        <path d="${s4ToS3LoopPath}" fill="none" stroke="#d97706" stroke-width="3.2" stroke-dasharray="6,3" class="loop-active-path" marker-end="url(#marker-loop-amber-act5)"/>
        <rect x="${s4LoopLeftX - 10}" y="${midYTimerLoop - 60}" width="20" height="120" rx="5" fill="#ffffff" stroke="#d97706" stroke-width="1.8"/>
        <text x="${s4LoopLeftX}" y="${midYTimerLoop}" fill="#b45309" font-family="'JetBrains Mono', monospace" font-size="9" font-weight="800" text-anchor="middle" dominant-baseline="central" transform="rotate(-90 ${s4LoopLeftX},${midYTimerLoop})">↺ RECOMPROVA TEMPS</text>

        <!-- Branca Dreta Retorn del Pas Escolar -->
        <path d="${rightBranchPaths}" fill="none" stroke="#2563eb" stroke-width="3" stroke-dasharray="7,4" class="loop-active-path" marker-end="url(#marker-loop-blue-act5)" filter="url(#glow-blue-act5)"/>
        <rect x="${rightGutterX - 14}" y="${midYRight - 80}" width="28" height="160" rx="6" fill="#ffffff" stroke="#2563eb" stroke-width="2"/>
        <text x="${rightGutterX}" y="${midYRight}" fill="#1d4ed8" font-family="'JetBrains Mono', monospace" font-size="10.5" font-weight="800" text-anchor="middle" dominant-baseline="central" transform="rotate(90 ${rightGutterX},${midYRight})">BUCLE DE TRÀNSIT ↺</text>
    `;
}

function drawAllLoopArrows() {
    drawAct1Loop();
    drawAct2Loop();
    drawAct3Loop();
    drawAct4Loop();
    drawAct5Loop();
    drawAct6Loop();
}

// ============================================================================
// REPTES AVANÇATS (STAGES 9, 10 I 11): BUGS, TRAÇA I CAIXA NEGRA
// ============================================================================

// --- STAGE 9: REPTE 7 — CAÇADOR DE BUGS (DEPURACIÓ HIVERNACLE MULTI-SENSOR I BUCLE CONTINU) ---
let bugState = {
    temp: 34,
    hum: 20,
    fixedBug1: false,
    fixedBug2: false
};

function setBugSimSensors(temp, hum) {
    if (temp !== null && temp !== undefined) bugState.temp = parseInt(temp, 10);
    if (hum !== null && hum !== undefined) bugState.hum = parseInt(hum, 10);

    const tempValEl = document.getElementById('bug-temp-val');
    const humValEl = document.getElementById('bug-hum-val');
    const tempSlider = document.getElementById('bug-temp-slider');
    const humSlider = document.getElementById('bug-hum-slider');
    const tempBadge = document.getElementById('bug-temp-badge');
    const humBadge = document.getElementById('bug-hum-badge');

    if (tempValEl) tempValEl.textContent = `${bugState.temp} °C`;
    if (tempSlider) tempSlider.value = bugState.temp;
    if (humValEl) humValEl.textContent = `${bugState.hum}%`;
    if (humSlider) humSlider.value = bugState.hum;

    if (tempBadge) {
        if (bugState.temp > 28) {
            tempBadge.textContent = `🔥 ${bugState.temp} °C (Calor)`;
            tempBadge.style.background = '#fee2e2';
            tempBadge.style.color = '#b91c1c';
            tempBadge.style.borderColor = '#fca5a5';
        } else if (bugState.temp < 16) {
            tempBadge.textContent = `❄️ ${bugState.temp} °C (Fred)`;
            tempBadge.style.background = '#e0f2fe';
            tempBadge.style.color = '#0369a1';
            tempBadge.style.borderColor = '#7dd3fc';
        } else {
            tempBadge.textContent = `🌱 ${bugState.temp} °C (Òptim)`;
            tempBadge.style.background = '#dcfce7';
            tempBadge.style.color = '#15803d';
            tempBadge.style.borderColor = '#86efac';
        }
    }

    if (humBadge) {
        if (bugState.hum < 35) {
            humBadge.textContent = `💧 ${bugState.hum}% (Sòl Sec)`;
            humBadge.style.background = '#fef3c7';
            humBadge.style.color = '#92400e';
            humBadge.style.borderColor = '#fcd34d';
        } else {
            humBadge.textContent = `💧 ${bugState.hum}% (Sòl Humit)`;
            humBadge.style.background = '#e0f2fe';
            humBadge.style.color = '#0284c7';
            humBadge.style.borderColor = '#bae6fd';
        }
    }
}

function runBugDiagnosis() {
    const logBox = document.getElementById('bug-diag-log');
    const errorCard = document.getElementById('bug-fix-section');
    const flawedCalor = document.getElementById('bug-node-calor');
    const t = bugState.temp;
    const h = bugState.hum;

    if (!bugState.fixedBug1 || !bugState.fixedBug2) {
        if (!bugState.fixedBug1 && t > 28) {
            if (flawedCalor) flawedCalor.classList.add('bug-node-flawed');
            if (logBox) {
                logBox.style.background = '#450a0a';
                logBox.style.color = '#fecaca';
                logBox.style.borderColor = '#ef4444';
                logBox.innerHTML = `🚨 <strong>BUG 1 DETECTAT!</strong> A <strong>${t} °C</strong> (fa molta calor), l'algorisme pren la branca SÍ cap a: <em>«Activar Calefacció Tèrmica 🔥»</em>! Això farà cremar les tomaqueres! Hauria d'activar els <strong>Ventiladors ❄️</strong>!`;
            }
            if (errorCard) errorCard.style.display = 'block';
            return;
        }

        if (!bugState.fixedBug2 && t < 16) {
            if (logBox) {
                logBox.style.background = '#78350f';
                logBox.style.color = '#fef3c7';
                logBox.style.borderColor = '#f59e0b';
                logBox.innerHTML = `🚨 <strong>BUG 2 DETECTAT (BUCLE TRENCAT)!</strong> A <strong>${t} °C</strong> amb <strong>${h}% d'humitat</strong> (terra seca), s'activa el calefactor però la fletxa fa un salt directe al bucle de 15 minuts <strong>sense passar mai pel mòdul de reg</strong>! Les plantes s'estan morint de set en nits fredes!`;
            }
            if (errorCard) errorCard.style.display = 'block';
            return;
        }

        if (logBox) {
            logBox.style.background = '#0f172a';
            logBox.style.color = '#fde047';
            logBox.style.borderColor = '#334155';
            logBox.innerHTML = `⚠️ <strong>Condicions actuals (${t} °C, ${h}% humitat):</strong> Per reproduir els errors crítics, selecciona el botó <em>«☀️ Canícula Seca»</em> o <em>«❄️ Matinada Freda i Seca»</em> i torna a prémer «Executar Diagnòstic»!`;
        }
    } else {
        // Ambdós bugs resolts
        if (logBox) {
            logBox.style.background = '#064e3b';
            logBox.style.color = '#a7f3d0';
            logBox.style.borderColor = '#10b981';
            const accioClima = t > 28 ? 'Ventiladors freds activats ❄️' : (t < 16 ? 'Calefactor tèrmic activat 🔥' : 'Climatització en repòs 🌱');
            const accioReg = h < 35 ? 'Reg per degoteig obert 💧' : 'Vàlvula de reg tancada 🛑';
            logBox.innerHTML = `✅ <strong>BUCLE CONTINU EXECUTAT IMPEBLEMENT:</strong><br>1r Pas (Climatització): ${accioClima} ➔ 2n Pas (Reg continu): ${accioReg} ➔ 3r Pas: Pausa de 15 min ➔ <strong>Retorn al bucle ↺ per a la següent lectura de sensors</strong>!`;
        }
    }
}

function applyGreenhouseBugFixes() {
    const fb = document.getElementById('bug-fix-feedback');
    const finishBtn = document.getElementById('btn-finish-stage-9');
    const flawedCalor = document.getElementById('bug-node-calor');
    const bypassAlert = document.getElementById('bug-arrow-fred-bypass');
    const loopInd = document.getElementById('greenhouse-loop-indicator');

    const opt1 = document.querySelector('input[name="bug-fix-1"]:checked');
    const opt2 = document.querySelector('input[name="bug-fix-2"]:checked');

    if (!opt1 || !opt2) {
        alert("⚠️ Si us plau, respon a les dues preguntes del Taller de Depuració.");
        return;
    }

    if (opt1.value === 'fans' && opt2.value === 'reconnect') {
        bugState.fixedBug1 = true;
        bugState.fixedBug2 = true;

        if (flawedCalor) {
            flawedCalor.classList.remove('bug-node-flawed');
            flawedCalor.classList.add('bug-node-fixed');
            flawedCalor.innerHTML = `Activar Ventiladors i Extractors Freds ❄️`;
        }

        if (bypassAlert) {
            bypassAlert.style.background = '#ecfdf5';
            bypassAlert.style.borderColor = '#10b981';
            bypassAlert.style.color = '#065f46';
            bypassAlert.innerHTML = `✅ Fletxa connectada correctament al Sistema de Reg abans del bucle`;
        }

        if (loopInd) {
            loopInd.style.borderLeftColor = '#10b981';
            loopInd.style.borderTopColor = '#10b981';
            loopInd.style.borderBottomColor = '#10b981';
            const t = loopInd.querySelector('span');
            if (t) t.style.color = '#059669';
            const arr = loopInd.querySelector('div');
            if (arr) arr.style.color = '#059669';
        }

        if (fb) {
            fb.style.display = 'block';
            fb.style.background = '#ecfdf5';
            fb.style.color = '#065f46';
            fb.style.border = '2px solid #10b981';
            fb.innerHTML = `🎉 <strong>AMBDÓS BUGS HAN ESTAT REPARATS AMB ÈXIT!</strong><br>Ara l'algorisme engega els ventiladors en dies caniculars i sempre comprova la humitat del sòl en nits fredes abans de reiniciar el bucle de 15 minuts.`;
        }

        if (finishBtn) finishBtn.style.display = 'inline-block';
        runBugDiagnosis();
    } else {
        applyXpPenalty('stage9', 15);
        if (fb) {
            fb.style.display = 'block';
            fb.style.background = '#fef2f2';
            fb.style.color = '#991b1b';
            fb.style.border = '2px solid #ef4444';
            fb.innerHTML = `❌ <strong>Alguna de les solucions seleccionades no és correcta (-15 XP).</strong> Revisa quina acció refresca l'ambient quan fa massa calor i com ha d'enllaçar el flux de la calefacció amb el reg.`;
        }
    }
}

function finishStage9() {
    showVictory(9, "Repte 7 Superat: Caçador de Bugs 🐛", "Has trobat els 2 errors de codi, has restaurat el bucle continu i has salvat les tomaqueres de l'hivernacle!");
}

// --- STAGE 10: REPTE 8 — TAULA DE TRAÇA I VARIABLES (CAIXER AUTOMÀTIC) ---
const TRACE_STEPS_DATA = [
    {
        pas: "Inici",
        nodeId: "atm-node-0",
        nodeNom: "💳 Inserir Targeta i PIN",
        accio: "Client introdueix targeta",
        intents: 0,
        saldo: "120 €",
        estat: "Sessió iniciada a la memòria",
        explicacio: "Valors inicials a la memòria RAM: Intents = 0, Saldo = 120 €. La màquina espera que l'usuari teclegi el PIN."
    },
    {
        pas: "Pas 1",
        nodeId: "atm-node-6",
        nodeNom: "Intents = Intents + 1",
        accio: "PIN '9999' erroni (1r error)",
        intents: 1,
        saldo: "120 €",
        estat: "Intents s'incrementa a 1 (1 < 3)",
        explicacio: "La decisió «PIN correcte?» pren la branca NO. S'executa «Intents = Intents + 1» (0 + 1 = 1). Com que 1 < 3, la decisió «Intents ≥ 3?» pren el camí de bucle ↺ per reintentar."
    },
    {
        pas: "Pas 2",
        nodeId: "atm-node-6",
        nodeNom: "Intents = Intents + 1",
        accio: "PIN '1111' erroni (2n error)",
        intents: 2,
        saldo: "120 €",
        estat: "Intents s'incrementa a 2 (2 < 3)",
        explicacio: "Torna a fallar el PIN (branca NO). La memòria suma un altre intent fallit: Intents passa a 2. El bucle ↺ li dóna un últim intent."
    },
    {
        pas: "Pas 3",
        nodeId: "atm-node-2",
        nodeNom: "Demanar import a retirar",
        accio: "PIN '1234' correcte!",
        intents: 2,
        saldo: "120 €",
        estat: "PIN validat amb èxit",
        explicacio: "El PIN és vàlid: la decisió pren la branca SÍ. Surt del bucle d'errors i avança cap a «Demanar import a retirar (40 €)»."
    },
    {
        pas: "Pas 4",
        nodeId: "atm-node-3",
        nodeNom: "Import (40 €) ≤ Saldo?",
        accio: "Comprovació: 40 € ≤ 120 €? (SÍ)",
        intents: 2,
        saldo: "120 €",
        estat: "Condició SÍ: prou diners",
        explicacio: "El rombe «Import ≤ Saldo?» avalua cert (40 € ≤ 120 €). El flux continua cap a l'operació matemàtica del saldo."
    },
    {
        pas: "Pas 5",
        nodeId: "atm-node-4",
        nodeNom: "Saldo = Saldo - 40 €",
        accio: "Dispensar 40 € i Rebut 💵",
        intents: 2,
        saldo: "80 €",
        estat: "Saldo = 120 - 40 = 80 €",
        explicacio: "S'executa l'operació matemàtica a la memòria: Saldo passa de 120 € a 80 €, es dispensen els 40 € i la sessió finalitza amb èxit."
    }
];

let traceCurrentStep = 0;
let traceUserAnswers = {};

function renderTraceTable() {
    const tbody = document.getElementById('trace-table-body');
    const chipIntents = document.getElementById('trace-chip-intents');
    const chipSaldo = document.getElementById('trace-chip-saldo');
    const logEl = document.getElementById('trace-step-log');
    if (!tbody) return;

    // Desactivar highlight anterior a tots els nodes del diagrama
    document.querySelectorAll('.atm-flow-node').forEach(node => {
        node.classList.remove('active-node');
    });

    tbody.innerHTML = '';
    for (let i = 0; i <= traceCurrentStep; i++) {
        const item = TRACE_STEPS_DATA[i];
        const tr = document.createElement('tr');
        if (i === traceCurrentStep) tr.className = 'active-row';
        tr.innerHTML = `
            <td><strong>${item.pas}</strong></td>
            <td style="color:#6d28d9; font-weight:700;">${item.nodeNom}</td>
            <td>${item.accio}</td>
            <td style="color:#d97706; font-weight:800;">${item.intents} / 3</td>
            <td style="color:#059669; font-weight:800;">${item.saldo}</td>
            <td>${item.estat}</td>
        `;
        tbody.appendChild(tr);
    }

    const curr = TRACE_STEPS_DATA[traceCurrentStep];
    if (chipIntents) chipIntents.textContent = `${curr.intents} / 3`;
    if (chipSaldo) chipSaldo.textContent = curr.saldo;
    if (logEl) logEl.innerHTML = `📍 <strong>${curr.pas} (${curr.nodeNom}):</strong> ${curr.explicacio}`;

    // Il·luminar el node actiu al diagrama de flux
    const activeBlock = document.getElementById(curr.nodeId);
    if (activeBlock) {
        activeBlock.classList.add('active-node');
    }
}

function runTraceNextStep() {
    if (traceCurrentStep < TRACE_STEPS_DATA.length - 1) {
        traceCurrentStep++;
        renderTraceTable();
    }
}

function resetTraceSim() {
    traceCurrentStep = 0;
    renderTraceTable();
}

function selectTraceAnswer(qNum, answerVal) {
    traceUserAnswers[qNum] = answerVal;

    const container = document.getElementById(`trace-q${qNum}-container`);
    if (container) {
        container.querySelectorAll('.trace-opt-btn').forEach(btn => {
            const isSel = (btn.getAttribute('data-val') === answerVal);
            btn.classList.toggle('selected', isSel);
        });
    }
}

function checkTraceAnswers() {
    const fb = document.getElementById('trace-answers-feedback');
    const finishBtn = document.getElementById('btn-finish-stage-10');

    const correctAnswers = {
        1: '3_errors',
        2: '70_euro',
        3: 'cert_50',
        4: 'fals_denegar',
        5: 'intents2_saldo120',
        6: 'bucle_infinit'
    };

    let correctCount = 0;
    const totalQuestions = 6;
    const wrongQuestions = [];

    for (let q = 1; q <= totalQuestions; q++) {
        if (traceUserAnswers[q] === correctAnswers[q]) {
            correctCount++;
        } else {
            wrongQuestions.push(q);
        }
    }

    if (correctCount === totalQuestions) {
        if (fb) {
            fb.style.display = 'block';
            fb.style.background = '#ecfdf5';
            fb.style.color = '#065f46';
            fb.style.border = '2px solid #10b981';
            fb.innerHTML = `🎉 <strong>EXCEL·LENT! 6 de 6 correctes (100%)!</strong><br>Has desxifrat la traça del diagrama a la perfecció. Domines com els robots utilitzen les variables de memòria RAM, les condicions de decisió límit (≤, ≥) i la prevenció de bucles infinits.`;
        }
        if (finishBtn) finishBtn.style.display = 'inline-block';
    } else {
        applyXpPenalty('stage10', 15);
        if (fb) {
            fb.style.display = 'block';
            fb.style.background = '#fef2f2';
            fb.style.color = '#991b1b';
            fb.style.border = '2px solid #ef4444';
            fb.innerHTML = `❌ <strong>Tens ${correctCount} de ${totalQuestions} respostes correctes (-15 XP).</strong><br>Revisa les preguntes pendents: <strong>Pregunta ${wrongQuestions.join(', Pregunta ')}</strong>. Observa el diagrama de flux i la taula de traça pas a pas per deduir el funcionament de la memòria i les condicions!`;
        }
    }
}

function finishStage10() {
    showVictory(10, "Repte 8 Superat: Taula de Traça 📊", "Has seguit l'execució pas a pas de la memòria d'un caixer automàtic i has comprès com funcionen les variables!");
}

// --- STAGE 11: REPTE 9 — LA CAIXA NEGRA (ENGINYERIA INVERSA D'UN ASCENSOR) ---
let blackboxState = {
    currentFloor: 0,
    requestedFloor: 0,
    overload: false,
    hasKey: false,
    selectedCandidate: null,
    testLogs: []
};

function setBlackboxFloor(f) {
    blackboxState.requestedFloor = parseInt(f, 10);
    [-2, -1, 0].forEach(n => {
        const b = document.getElementById(`bb-floor-btn-${n}`);
        if (b) b.classList.toggle('btn-primary', n === blackboxState.requestedFloor);
        if (b) b.classList.toggle('btn-outline', n !== blackboxState.requestedFloor);
    });
}

function toggleBlackboxOverload() {
    blackboxState.overload = !blackboxState.overload;
    const btn = document.getElementById('btn-bb-overload');
    if (btn) {
        btn.innerHTML = blackboxState.overload ? '⚖️ Pes: SOBRECÀRREGA (550 kg)' : '⚖️ Pes: Normal (220 kg)';
        btn.style.background = blackboxState.overload ? '#ef4444' : '#1e293b';
        btn.style.borderColor = blackboxState.overload ? '#dc2626' : '#475569';
        btn.style.color = '#ffffff';
    }
}

function toggleBlackboxKey() {
    blackboxState.hasKey = !blackboxState.hasKey;
    const btn = document.getElementById('btn-bb-key');
    if (btn) {
        btn.innerHTML = blackboxState.hasKey ? '🔑 Clau Seguretat: INTRODUÏDA' : '🔑 Clau Seguretat: NO';
        btn.style.background = blackboxState.hasKey ? '#f59e0b' : '#1e293b';
        btn.style.borderColor = blackboxState.hasKey ? '#d97706' : '#475569';
        btn.style.color = '#ffffff';
    }
}

function runBlackboxTest() {
    const cabin = document.getElementById('bb-elevator-cabin');
    const logBox = document.getElementById('bb-log-status');
    const listEl = document.getElementById('bb-test-history-list');
    const req = blackboxState.requestedFloor;
    let resultOutcome = '';

    if (blackboxState.overload) {
        resultOutcome = "🚨 ALARMA DE SOBRECÀRREGA! L'ascensor no es mou per seguretat.";
        if (logBox) {
            logBox.style.background = '#450a0a';
            logBox.style.color = '#fca5a5';
            logBox.innerHTML = `⚠️ <strong>Entrada:</strong> Sobrecàrrega detectada ➔ <strong>Reacció:</strong> Bloqueig de motors i senyal d'alarma.`;
        }
    } else if (req === -2 && !blackboxState.hasKey) {
        resultOutcome = "🔒 ACCÉS DENEGAT a Planta -2! Es requereix la clau especial.";
        if (logBox) {
            logBox.style.background = '#78350f';
            logBox.style.color = '#fde68a';
            logBox.innerHTML = `🔒 <strong>Entrada:</strong> Sol·licitada Planta -2 sense clau ➔ <strong>Reacció:</strong> Accés denegat, l'ascensor no es mou.`;
        }
    } else {
        blackboxState.currentFloor = req;
        resultOutcome = `✨ L'ascensor es mou i arriba a la Planta ${req}.`;
        if (cabin) {
            const topMap = { 0: '10px', '-1': '88px', '-2': '166px' };
            cabin.style.top = topMap[req];
            cabin.innerHTML = `<span>Planta ${req}</span><small style="font-size:0.68rem;">${req === -2 ? '🔬 Lab' : (req === -1 ? '📦 Mag' : '🏢 Ent')}</small>`;
        }
        if (logBox) {
            logBox.style.background = '#064e3b';
            logBox.style.color = '#a7f3d0';
            logBox.innerHTML = `✅ <strong>Comanda executada:</strong> Desplaçament correcte a la Planta ${req}.`;
        }
    }

    const testNum = blackboxState.testLogs.length + 1;
    const testEntry = `Prova #${testNum}: Destí Planta ${req} | Sobrecàrrega: ${blackboxState.overload ? 'SÍ' : 'NO'} | Clau: ${blackboxState.hasKey ? 'SÍ' : 'NO'} ➔ <strong>${resultOutcome}</strong>`;
    blackboxState.testLogs.push(testEntry);

    if (listEl) {
        const li = document.createElement('li');
        li.style.marginBottom = '0.35rem';
        li.innerHTML = testEntry;
        listEl.appendChild(li);
    }
}

function selectCandidateDiagram(candId) {
    blackboxState.selectedCandidate = candId;
    ['A', 'B', 'C'].forEach(id => {
        const el = document.getElementById(`candidate-diag-${id}`);
        if (el) el.classList.toggle('selected', id === candId);
    });
}

function verifyBlackboxCandidate() {
    const fb = document.getElementById('bb-candidate-feedback');
    const finishBtn = document.getElementById('btn-finish-stage-11');

    if (blackboxState.selectedCandidate === 'B') {
        if (fb) {
            fb.style.display = 'block';
            fb.style.background = '#ecfdf5';
            fb.style.color = '#065f46';
            fb.style.border = '2px solid #10b981';
            fb.innerHTML = `🎉 <strong>ENGINYERIA INVERSA COMPLETADA AMB ÈXIT!</strong><br>El <strong>Diagrama B</strong> és exactament el codi intern de la Caixa Negra: primer prioritza la seguretat del sensor de pes, i després protegeix la planta secreta -2 comprovant la clau d'accés. Has superat tots els reptes!`;
        }
        if (finishBtn) finishBtn.style.display = 'inline-block';
    } else {
        applyXpPenalty('stage11', 15);
        if (fb) {
            fb.style.display = 'block';
            fb.style.background = '#fef2f2';
            fb.style.color = '#991b1b';
            fb.style.border = '2px solid #ef4444';
            fb.innerHTML = `❌ <strong>Aquest diagrama no coincideix amb els experiments realitzats (-15 XP).</strong> Revisa les proves del teu quadern: fixat què passa amb la sobrecàrrega a qualsevol pis i quan s'exigeix la clau.`;
        }
    }
}

function finishStage11() {
    showVictory(11, "Repte 9 Superat: Enginyeria Inversa de la Caixa Negra!", "Has deduït amb precisió científica l'algorisme secret de l'ascensor! El teu Diploma Oficial t'espera a la Fase 12!");
}

window.addEventListener('resize', () => {
    requestAnimationFrame(drawAllLoopArrows);
});

window.addEventListener('DOMContentLoaded', () => {
    loadState();
    updateBusSimSlider(6);
    
    // Configurar ResizeObserver per actualitzar les fletxes quan canvia el contingut dels taulers
    try {
        const ro = new ResizeObserver(() => {
            requestAnimationFrame(drawAllLoopArrows);
        });
        ['act1-board-inner', 'act2-board-inner', 'act3-board-inner', 'act4-board-inner', 'act5-board-inner', 'act6-board-inner'].forEach(id => {
            const el = document.getElementById(id);
            if (el) ro.observe(el);
        });
    } catch (_) {}
});
