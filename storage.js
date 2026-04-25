/**
 * Gerenciamento de Dados — Firebase Firestore
 * Substitui o localStorage mantendo o mesmo contrato de API
 * para que modal.js, ui.js, ranking.js e app.js não precisem mudar.
 */

// ── Firebase SDK (via CDN, módulo compat) ─────────────────────────────────────
// Carregado pelo index.html antes deste arquivo

const _db = firebase.firestore();

// Referências dos documentos no Firestore
const _REF = {
    current: _db.collection('motodiario').doc('currentData'),
    trips:   _db.collection('motodiario').doc('tripsLog'),
    history: _db.collection('motodiario').doc('history'),
    meta:    _db.collection('motodiario').doc('meta')
};

// Cache local (evita tela em branco enquanto o Firestore responde)
let _cache = {
    currentData: JSON.parse(JSON.stringify(DEFAULT_DATA)),
    tripsLog:    { samuel: [], luan: [], kaio: [] },
    history:     [],
    lastReset:   null
};

// ── Listener em tempo real ────────────────────────────────────────────────────
// Quando qualquer outro dispositivo salvar dados, a UI atualiza automaticamente.

function _startRealtimeListeners() {
    _REF.current.onSnapshot(snap => {
        if (!snap.exists) return;
        _cache.currentData = snap.data();
        UI.updateHome(_cache.currentData);
        Rankings.update();
    });

    _REF.trips.onSnapshot(snap => {
        if (!snap.exists) return;
        _cache.tripsLog = snap.data();
        UI.renderTripsFeed();
    });

    _REF.history.onSnapshot(snap => {
        if (!snap.exists) return;
        _cache.history = snap.data().list || [];
    });

    _REF.meta.onSnapshot(snap => {
        if (!snap.exists) return;
        _cache.lastReset = snap.data().lastReset || null;
    });
}

// ── Inicialização ─────────────────────────────────────────────────────────────
// Garante que os documentos existam no Firestore na primeira execução.

async function _ensureDocuments() {
    const snap = await _REF.current.get();
    if (!snap.exists) {
        await _REF.current.set(JSON.parse(JSON.stringify(DEFAULT_DATA)));
        await _REF.trips.set({ samuel: [], luan: [], kaio: [] });
        await _REF.history.set({ list: [] });
        const now = new Date();
        await _REF.meta.set({ lastReset: `${now.getFullYear()}-${now.getMonth()}` });
    } else {
        // Popula cache inicial
        _cache.currentData = snap.data();
        const [t, h, m] = await Promise.all([
            _REF.trips.get(),
            _REF.history.get(),
            _REF.meta.get()
        ]);
        if (t.exists) _cache.tripsLog  = t.data();
        if (h.exists) _cache.history   = h.data().list || [];
        if (m.exists) _cache.lastReset = m.data().lastReset || null;
    }
}

// ── API pública (mesmo contrato do Storage original) ─────────────────────────

const Storage = {

    // Inicializa tudo — chamado uma vez no app.js
    async init() {
        await _ensureDocuments();
        _startRealtimeListeners();
        await this.checkMonthlyReset();
    },

    // ── Leitura (síncrona do cache) ───────────────────────────────────────────

    getCurrentData() {
        return JSON.parse(JSON.stringify(_cache.currentData));
    },

    getTripsLog() {
        return JSON.parse(JSON.stringify(_cache.tripsLog));
    },

    getAllTripsFlat() {
        const log = this.getTripsLog();
        const all = [];
        USERS.forEach(user => {
            (log[user] || []).forEach(trip => all.push({ ...trip, user }));
        });
        return all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    },

    getHistory() {
        return JSON.parse(JSON.stringify(_cache.history));
    },

    // ── Escrita (async no Firestore) ──────────────────────────────────────────

    async addTrip(username, value) {
        const data = this.getCurrentData();
        const log  = this.getTripsLog();

        if (!log[username]) log[username] = [];

        const tripEntry = {
            id:        Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            value:     parseFloat(value.toFixed(2)),
            timestamp: new Date().toISOString()
        };

        log[username].push(tripEntry);

        if (!data[username]) data[username] = { trips: 0, spent: 0 };
        data[username].trips += 1;
        data[username].spent  = parseFloat((data[username].spent + tripEntry.value).toFixed(2));

        // Atualiza cache imediatamente (UI responde sem esperar o servidor)
        _cache.currentData = data;
        _cache.tripsLog    = log;

        // Persiste no Firestore em paralelo
        await Promise.all([
            _REF.current.set(data),
            _REF.trips.set(log)
        ]);

        return { data, tripEntry };
    },

    async removeLastTrip(username) {
        const data = this.getCurrentData();
        const log  = this.getTripsLog();

        if (!log[username] || log[username].length === 0) return false;

        const removed = log[username].pop();

        if (data[username]) {
            data[username].trips = Math.max(0, data[username].trips - 1);
            data[username].spent = Math.max(0, parseFloat((data[username].spent - removed.value).toFixed(2)));
        }

        _cache.currentData = data;
        _cache.tripsLog    = log;

        await Promise.all([
            _REF.current.set(data),
            _REF.trips.set(log)
        ]);

        return true;
    },

    async archiveCurrentMonth() {
        const currentData = this.getCurrentData();
        const now         = new Date();
        const monthIndex  = now.getMonth();
        const year        = now.getFullYear();

        const monthEntry = {
            id:         `${year}-${monthIndex}`,
            label:      `${MONTH_NAMES[monthIndex]} ${year}`,
            year,
            month:      monthIndex,
            data:       JSON.parse(JSON.stringify(currentData)),
            totalTrips: this.getTotalTrips(currentData),
            totalSpent: this.getTotalSpent(currentData)
        };

        const history = this.getHistory();
        if (!history.some(e => e.id === monthEntry.id)) {
            history.unshift(monthEntry);
            _cache.history = history;
            await _REF.history.set({ list: history });
        }

        const emptyData = JSON.parse(JSON.stringify(DEFAULT_DATA));
        const emptyLog  = { samuel: [], luan: [], kaio: [] };
        _cache.currentData = emptyData;
        _cache.tripsLog    = emptyLog;

        await Promise.all([
            _REF.current.set(emptyData),
            _REF.trips.set(emptyLog)
        ]);
    },

    async checkMonthlyReset() {
        const now          = new Date();
        const currentMonth = `${now.getFullYear()}-${now.getMonth()}`;

        if (_cache.lastReset !== currentMonth) {
            const currentData = this.getCurrentData();
            const hasData     = USERS.some(u => (currentData[u]?.trips || 0) > 0);
            if (hasData) await this.archiveCurrentMonth();
            else {
                const emptyData = JSON.parse(JSON.stringify(DEFAULT_DATA));
                const emptyLog  = { samuel: [], luan: [], kaio: [] };
                _cache.currentData = emptyData;
                _cache.tripsLog    = emptyLog;
                await Promise.all([
                    _REF.current.set(emptyData),
                    _REF.trips.set(emptyLog)
                ]);
            }

            _cache.lastReset = currentMonth;
            await _REF.meta.set({ lastReset: currentMonth });
            return true;
        }
        return false;
    },

    // ── Helpers ───────────────────────────────────────────────────────────────

    getTotalTrips(data) {
        return USERS.reduce((t, u) => t + (data[u]?.trips || 0), 0);
    },

    getTotalSpent(data) {
        return parseFloat(USERS.reduce((t, u) => t + (data[u]?.spent || 0), 0).toFixed(2));
    }
};