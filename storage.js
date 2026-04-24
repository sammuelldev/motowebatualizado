/**
 * Gerenciamento do LocalStorage
 */

const Storage = {

    // ── Dados agregados do mês atual ──────────────────────────────────────────

    getCurrentData() {
        const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_DATA);
        if (!raw) {
            this.saveCurrentData(JSON.parse(JSON.stringify(DEFAULT_DATA)));
            return JSON.parse(JSON.stringify(DEFAULT_DATA));
        }
        try { return JSON.parse(raw); }
        catch (e) { return JSON.parse(JSON.stringify(DEFAULT_DATA)); }
    },

    saveCurrentData(data) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_DATA, JSON.stringify(data));
    },

    // ── Log individual de viagens ─────────────────────────────────────────────

    getTripsLog() {
        const raw = localStorage.getItem(STORAGE_KEYS.TRIPS_LOG);
        const empty = { samuel: [], luan: [], kaio: [] };
        if (!raw) { this.saveTripsLog(empty); return empty; }
        try { return JSON.parse(raw); }
        catch (e) { return empty; }
    },

    saveTripsLog(log) {
        localStorage.setItem(STORAGE_KEYS.TRIPS_LOG, JSON.stringify(log));
    },

    /** Retorna todas as viagens do mês ordenadas da mais recente para a mais antiga */
    getAllTripsFlat() {
        const log = this.getTripsLog();
        const all = [];
        USERS.forEach(user => {
            (log[user] || []).forEach(trip => {
                all.push({ ...trip, user });
            });
        });
        return all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    },

    // ── Adicionar / Remover ───────────────────────────────────────────────────

    addTrip(username, value) {
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

        this.saveTripsLog(log);
        this.saveCurrentData(data);

        return { data, tripEntry };
    },

    removeLastTrip(username) {
        const data = this.getCurrentData();
        const log  = this.getTripsLog();

        if (!log[username] || log[username].length === 0) return false;

        const removed = log[username].pop();

        if (data[username]) {
            data[username].trips = Math.max(0, data[username].trips - 1);
            data[username].spent = Math.max(0, parseFloat((data[username].spent - removed.value).toFixed(2)));
        }

        this.saveTripsLog(log);
        this.saveCurrentData(data);
        return true;
    },

    // ── Histórico mensal ──────────────────────────────────────────────────────

    getHistory() {
        const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
        if (!raw) return [];
        try { return JSON.parse(raw); }
        catch (e) { return []; }
    },

    saveHistory(history) {
        localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    },

    archiveCurrentMonth() {
        const currentData = this.getCurrentData();
        const now         = new Date();
        const monthIndex  = now.getMonth();
        const year        = now.getFullYear();

        const monthEntry = {
            id:          `${year}-${monthIndex}`,
            label:       `${MONTH_NAMES[monthIndex]} ${year}`,
            year,
            month:       monthIndex,
            data:        JSON.parse(JSON.stringify(currentData)),
            totalTrips:  this.getTotalTrips(currentData),
            totalSpent:  this.getTotalSpent(currentData)
        };

        const history = this.getHistory();
        if (!history.some(e => e.id === monthEntry.id)) {
            history.unshift(monthEntry);
            this.saveHistory(history);
        }

        // Reseta tudo
        this.saveCurrentData(JSON.parse(JSON.stringify(DEFAULT_DATA)));
        this.saveTripsLog({ samuel: [], luan: [], kaio: [] });
    },

    checkMonthlyReset() {
        const lastReset    = localStorage.getItem(STORAGE_KEYS.LAST_RESET);
        const now          = new Date();
        const currentMonth = `${now.getFullYear()}-${now.getMonth()}`;

        if (lastReset !== currentMonth) {
            const currentData = this.getCurrentData();
            const hasData     = USERS.some(u => (currentData[u]?.trips || 0) > 0);
            if (hasData) this.archiveCurrentMonth();
            else {
                this.saveCurrentData(JSON.parse(JSON.stringify(DEFAULT_DATA)));
                this.saveTripsLog({ samuel: [], luan: [], kaio: [] });
            }
            localStorage.setItem(STORAGE_KEYS.LAST_RESET, currentMonth);
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
    },

    /** ZERA TUDO — chamado uma única vez na inicialização para garantir slate limpo */
    hardReset() {
        Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
        this.saveCurrentData(JSON.parse(JSON.stringify(DEFAULT_DATA)));
        this.saveTripsLog({ samuel: [], luan: [], kaio: [] });
        const now = new Date();
        localStorage.setItem(STORAGE_KEYS.LAST_RESET, `${now.getFullYear()}-${now.getMonth()}`);
    }
};
