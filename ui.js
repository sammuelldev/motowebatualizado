/**
 * Manipulação da Interface do Usuário
 */

const UI = {
    elements: {
        totalTrips:       document.getElementById('totalTrips'),
        totalSpent:       document.getElementById('totalSpent'),
        homeSection:      document.getElementById('homeSection'),
        rankingsSection:  document.getElementById('rankingsSection'),
        tripsSection:     document.getElementById('tripsSection'),
        historySection:   document.getElementById('historySection'),
        rankingTrips:     document.getElementById('rankingTrips'),
        rankingSpent:     document.getElementById('rankingSpent'),
        tripsFeed:        document.getElementById('tripsFeed'),
        historyList:      document.getElementById('historyList'),
        historyDetail:    document.getElementById('historyDetail'),
        menuToggle:       document.getElementById('menuToggle'),
        menuDropdown:     document.getElementById('menuDropdown')
    },

    // ── Home ──────────────────────────────────────────────────────────────────

    updateHome(data) {
        this.elements.totalTrips.textContent = Storage.getTotalTrips(data);
        this.elements.totalSpent.textContent = this.formatCurrency(Storage.getTotalSpent(data));

        USERS.forEach(user => {
            const tripsEl  = document.getElementById(`trips-${user}`);
            const spentEl  = document.getElementById(`spent-${user}`);
            const removeBtn = document.getElementById(`remove-${user}`);

            if (tripsEl)  tripsEl.textContent  = data[user]?.trips || 0;
            if (spentEl)  spentEl.textContent  = this.formatCurrency(data[user]?.spent || 0);

            if (removeBtn) {
                const has = (data[user]?.trips || 0) > 0;
                removeBtn.disabled = !has;
                removeBtn.classList.toggle('btn-remove-disabled', !has);
            }
        });
    },

    // ── Seções ────────────────────────────────────────────────────────────────

    showSection(name) {
        ['homeSection','rankingsSection','tripsSection','historySection'].forEach(id => {
            this.elements[id].classList.add('hidden');
        });
        const target = document.getElementById(name + 'Section');
        if (target) target.classList.remove('hidden');
    },

    // ── Rankings ──────────────────────────────────────────────────────────────

    renderRankings(data) {
        this._renderRankingList(
            this.elements.rankingTrips,
            USERS.map(u => ({ name: u, value: data[u]?.trips || 0 })).sort((a,b) => b.value - a.value),
            item => `${item.value} viagens`
        );
        this._renderRankingList(
            this.elements.rankingSpent,
            USERS.map(u => ({ name: u, value: data[u]?.spent || 0 })).sort((a,b) => b.value - a.value),
            item => this.formatCurrency(item.value)
        );
    },

    _renderRankingList(container, sorted, labelFn) {
        const medals = ['🥇','🥈','🥉'];
        container.innerHTML = sorted.map((item, i) => `
            <div class="ranking-item">
                <span class="medal">${medals[i]}</span>
                <span class="rank-name">${item.name}</span>
                <span class="rank-value">${labelFn(item)}</span>
            </div>
        `).join('');
    },

    // ── Feed de viagens do mês ────────────────────────────────────────────────

    renderTripsFeed() {
        const trips = Storage.getAllTripsFlat();
        const feed  = this.elements.tripsFeed;

        if (trips.length === 0) {
            feed.innerHTML = '<p class="empty-message">Nenhuma viagem registrada este mês</p>';
            return;
        }

        feed.innerHTML = trips.map(trip => {
            const date = new Date(trip.timestamp);
            const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const name    = trip.user.charAt(0).toUpperCase() + trip.user.slice(1);

            return `
                <div class="trip-item">
                    <span class="trip-emoji">${USER_EMOJIS[trip.user]}</span>
                    <div class="trip-info">
                        <span class="trip-name">${name}</span>
                        <span class="trip-time">${dateStr} às ${timeStr}</span>
                    </div>
                    <span class="trip-value">${this.formatCurrency(trip.value)}</span>
                </div>
            `;
        }).join('');
    },

    // ── Histórico mensal ──────────────────────────────────────────────────────

    renderHistory() {
        const history = Storage.getHistory();

        if (history.length === 0) {
            this.elements.historyList.innerHTML = '<p class="empty-message">Nenhum mês encerrado ainda</p>';
            return;
        }

        this.elements.historyList.innerHTML = history.map(entry => `
            <div class="history-card" data-id="${entry.id}">
                <h4>${entry.label}</h4>
                <p>${entry.totalTrips} viagens</p>
                <p>${this.formatCurrency(entry.totalSpent)}</p>
            </div>
        `).join('');

        document.querySelectorAll('.history-card').forEach(card => {
            card.addEventListener('click', () => this.renderHistoryDetail(card.dataset.id));
        });
    },

    renderHistoryDetail(monthId) {
        const entry = Storage.getHistory().find(e => e.id === monthId);
        if (!entry) return;

        this.elements.historyDetail.classList.remove('hidden');
        this.elements.historyDetail.innerHTML = `
            <button class="btn-back" onclick="UI.closeHistoryDetail()">← Voltar</button>
            <h3>📅 ${entry.label}</h3>
            <div style="margin-top:1rem">
                <h4 style="margin-bottom:.5rem">Viagens: ${entry.totalTrips}</h4>
                <h4 style="margin-bottom:1rem">Gasto Total: ${this.formatCurrency(entry.totalSpent)}</h4>
            </div>
            ${USERS.map(user => `
                <div class="ranking-item" style="margin-bottom:.5rem">
                    <span>${USER_EMOJIS[user]}</span>
                    <span class="rank-name">${user}</span>
                    <span>${entry.data[user]?.trips || 0} viagens</span>
                    <span>${this.formatCurrency(entry.data[user]?.spent || 0)}</span>
                </div>
            `).join('')}
            <div style="margin-top:1rem">
                <h4>🏆 Ranking do Mês</h4>
                ${this._monthlyRankingHTML(entry.data)}
            </div>
        `;
    },

    _monthlyRankingHTML(data) {
        const medals  = ['🥇','🥈','🥉'];
        const sorted  = USERS.map(u => ({
            name:  u,
            trips: data[u]?.trips || 0,
            spent: data[u]?.spent || 0
        })).sort((a,b) => b.trips - a.trips);

        return sorted.map((item, i) => `
            <div class="ranking-item">
                <span class="medal">${medals[i]}</span>
                <span class="rank-name">${item.name}</span>
                <span>${item.trips} viagens | ${this.formatCurrency(item.spent)}</span>
            </div>
        `).join('');
    },

    closeHistoryDetail() {
        this.elements.historyDetail.classList.add('hidden');
    },

    // ── Remove viagem ─────────────────────────────────────────────────────────

    removeLastTrip(username) {
        const btn = document.getElementById(`remove-${username}`);
        if (!btn || btn.disabled) return;

        const removed = Storage.removeLastTrip(username);
        if (!removed) { this.showToast('Nenhuma viagem para remover', 'warning'); return; }

        const card = document.querySelector(`[data-user="${username}"]`);
        if (card) {
            card.classList.add('remove-animation');
            setTimeout(() => card.classList.remove('remove-animation'), 400);
        }

        const data = Storage.getCurrentData();
        this.updateHome(data);
        Rankings.update();
        this.renderTripsFeed();

        const name = username.charAt(0).toUpperCase() + username.slice(1);
        this.showToast(`Viagem de ${name} removida`, 'warning');
    },

    // ── Toast ─────────────────────────────────────────────────────────────────

    showToast(message, type = 'success') {
        const existing = document.getElementById('ui-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.id        = 'ui-toast';
        toast.className = `ui-toast ui-toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        void toast.offsetWidth;
        toast.classList.add('ui-toast-visible');

        setTimeout(() => {
            toast.classList.remove('ui-toast-visible');
            setTimeout(() => toast.remove(), 300);
        }, 2200);
    },

    // ── Helpers ───────────────────────────────────────────────────────────────

    formatCurrency(value) {
        return 'R$ ' + (value || 0).toFixed(2).replace('.', ',');
    }
};
