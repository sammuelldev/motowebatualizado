/**
 * Manipulação da Interface do Usuário
 */

// ── Animação de números ────────────────────────────────────────────────────────
function animateNumber(el, newVal, currency = false, duration = 400) {
    const startVal = parseFloat(el.dataset.animVal || 0);
    el.dataset.animVal = newVal;
    if (startVal === newVal) return;

    const startTime = performance.now();
    const easeOut = t => 1 - Math.pow(1 - t, 3);

    function tick(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        const current  = startVal + (newVal - startVal) * easeOut(progress);

        if (currency) {
            el.textContent = 'R$ ' + current.toFixed(2).replace('.', ',');
        } else {
            el.textContent = Math.round(current);
        }

        if (progress < 1) {
            requestAnimationFrame(tick);
        } else {
            el.textContent = currency
                ? 'R$ ' + newVal.toFixed(2).replace('.', ',')
                : Math.round(newVal);
        }
    }

    requestAnimationFrame(tick);
}

// ─────────────────────────────────────────────────────────────────────────────

const UI = {
    elements: {
        totalTrips:      document.getElementById('totalTrips'),
        totalSpent:      document.getElementById('totalSpent'),
        homeSection:     document.getElementById('homeSection'),
        rankingsSection: document.getElementById('rankingsSection'),
        tripsSection:    document.getElementById('tripsSection'),
        historySection:  document.getElementById('historySection'),
        chartsSection:   document.getElementById('chartsSection'),
        rankingTrips:    document.getElementById('rankingTrips'),
        rankingSpent:    document.getElementById('rankingSpent'),
        tripsFeed:       document.getElementById('tripsFeed'),
        historyList:     document.getElementById('historyList'),
        historyDetail:   document.getElementById('historyDetail'),
    },

    // ── Home ──────────────────────────────────────────────────────────────────

    updateHome(data) {
        animateNumber(this.elements.totalTrips, Storage.getTotalTrips(data));
        animateNumber(this.elements.totalSpent, Storage.getTotalSpent(data), true);

        USERS.forEach(user => {
            const tripsEl   = document.getElementById(`trips-${user}`);
            const spentEl   = document.getElementById(`spent-${user}`);
            const badgeEl   = document.getElementById(`badge-${user}`);
            const removeBtn = document.getElementById(`remove-${user}`);

            if (tripsEl) animateNumber(tripsEl, data[user]?.trips || 0);
            if (spentEl) animateNumber(spentEl, data[user]?.spent || 0, true);
            if (badgeEl) animateNumber(badgeEl, data[user]?.trips || 0);

            if (removeBtn) {
                const has = (data[user]?.trips || 0) > 0;
                removeBtn.disabled = !has;
            }
        });
    },

    // ── Seções ────────────────────────────────────────────────────────────────

    showSection(name) {
        const all = ['homeSection','rankingsSection','tripsSection','historySection','chartsSection'];
        all.forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.classList.remove('active'); el.classList.add('hidden'); }
        });

        // Atualiza tab bar
        document.querySelectorAll('.tab-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.section === name);
        });

        const target = document.getElementById(name + 'Section');
        if (target) {
            target.classList.remove('hidden');
            target.classList.add('active');
        }
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

    // ── Feed de viagens ───────────────────────────────────────────────────────

    renderTripsFeed() {
        const trips = Storage.getAllTripsFlat();
        const feed  = this.elements.tripsFeed;

        if (trips.length === 0) {
            feed.innerHTML = '<p class="empty-message">Nenhuma viagem registrada este mês</p>';
            return;
        }

        feed.innerHTML = trips.map(trip => {
            const date    = new Date(trip.timestamp);
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

    // ── Histórico ─────────────────────────────────────────────────────────────

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
            <h3 style="font-family:'Bebas Neue',sans-serif;font-size:1.5rem;letter-spacing:2px;margin-bottom:1rem">📅 ${entry.label}</h3>
            <div style="margin-bottom:1rem">
                <p style="font-size:0.85rem;color:var(--muted)">Viagens: <strong style="color:var(--text)">${entry.totalTrips}</strong></p>
                <p style="font-size:0.85rem;color:var(--muted)">Gasto Total: <strong style="color:var(--text)">${this.formatCurrency(entry.totalSpent)}</strong></p>
            </div>
            ${USERS.map(user => `
                <div class="ranking-item" style="margin-bottom:.5rem">
                    <span>${USER_EMOJIS[user]}</span>
                    <span class="rank-name">${user}</span>
                    <span style="font-size:0.82rem;color:var(--muted)">${entry.data[user]?.trips || 0} viagens</span>
                    <span class="rank-value">${this.formatCurrency(entry.data[user]?.spent || 0)}</span>
                </div>
            `).join('')}
            <div style="margin-top:1rem">
                <p style="font-size:0.65rem;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:.6rem">🏆 Ranking</p>
                ${this._monthlyRankingHTML(entry.data)}
            </div>
        `;
    },

    _monthlyRankingHTML(data) {
        const medals = ['🥇','🥈','🥉'];
        const sorted = USERS.map(u => ({
            name:  u,
            trips: data[u]?.trips || 0,
            spent: data[u]?.spent || 0
        })).sort((a,b) => b.trips - a.trips);

        return sorted.map((item, i) => `
            <div class="ranking-item">
                <span class="medal">${medals[i]}</span>
                <span class="rank-name">${item.name}</span>
                <span style="font-size:0.82rem;color:var(--muted)">${item.trips} viagens</span>
                <span class="rank-value">${this.formatCurrency(item.spent)}</span>
            </div>
        `).join('');
    },

    closeHistoryDetail() {
        this.elements.historyDetail.classList.add('hidden');
    },

    // ── Remove viagem ─────────────────────────────────────────────────────────

    async removeLastTrip(username) {
        const btn = document.getElementById(`remove-${username}`);
        if (!btn || btn.disabled) return;

        btn.disabled = true;

        const removed = await Storage.removeLastTrip(username);
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
        toast.id          = 'ui-toast';
        toast.className   = `ui-toast ui-toast-${type}`;
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