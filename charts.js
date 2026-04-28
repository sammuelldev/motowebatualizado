/**
 * Gráficos — Chart.js
 */

const Charts = {
    _instances: {},

    _colors: {
        samuel: { bg: 'rgba(59,130,246,0.65)',  border: '#3b82f6' },
        luan:   { bg: 'rgba(34,197,94,0.65)',   border: '#22c55e' },
        kaio:   { bg: 'rgba(245,158,11,0.65)',  border: '#f59e0b' }
    },

    _destroy(key) {
        if (this._instances[key]) {
            this._instances[key].destroy();
            delete this._instances[key];
        }
    },

    render() {
        this._renderTripsBar();
        this._renderSpentPie();
        this._renderAvgLine();
    },

    // ── Barras — viagens por pessoa ───────────────────────────────────────────
    _renderTripsBar() {
        this._destroy('tripsBar');

        const data    = Storage.getCurrentData();
        const labels  = USERS.map(u => u.charAt(0).toUpperCase() + u.slice(1));
        const values  = USERS.map(u => data[u]?.trips || 0);
        const colors  = USERS.map(u => this._colors[u].bg);
        const borders = USERS.map(u => this._colors[u].border);

        const ctx = document.getElementById('chartTripsBar').getContext('2d');
        this._instances.tripsBar = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Viagens',
                    data: values,
                    backgroundColor: colors,
                    borderColor: borders,
                    borderWidth: 2,
                    borderRadius: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: 'rgba(255,255,255,0.5)', stepSize: 1 },
                        grid:  { color: 'rgba(255,255,255,0.06)' }
                    },
                    x: {
                        ticks: { color: 'rgba(255,255,255,0.7)', font: { size: 13 } },
                        grid:  { display: false }
                    }
                }
            }
        });
    },

    // ── Donut — gastos por pessoa ─────────────────────────────────────────────
    _renderSpentPie() {
        this._destroy('spentPie');

        const data    = Storage.getCurrentData();
        const labels  = USERS.map(u => u.charAt(0).toUpperCase() + u.slice(1));
        const values  = USERS.map(u => data[u]?.spent || 0);
        const colors  = USERS.map(u => this._colors[u].bg);
        const borders = USERS.map(u => this._colors[u].border);
        const total   = values.reduce((a, b) => a + b, 0);

        const ctx = document.getElementById('chartSpentPie').getContext('2d');
        this._instances.spentPie = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data: total > 0 ? values : [1, 1, 1],
                    backgroundColor: colors,
                    borderColor: borders,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: 'rgba(255,255,255,0.7)', padding: 16, font: { size: 13 } }
                    },
                    tooltip: {
                        callbacks: {
                            label(ctx) {
                                if (total === 0) return ' Sem dados';
                                const pct = ((ctx.raw / total) * 100).toFixed(1);
                                return ` R$ ${ctx.raw.toFixed(2).replace('.', ',')} (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });
    },

    // ── Linha — gasto médio por viagem histórico ──────────────────────────────
    _renderAvgLine() {
        this._destroy('avgLine');

        const history      = Storage.getHistory();
        const currentData  = Storage.getCurrentData();
        const now          = new Date();
        const currentLabel = `${MONTH_NAMES[now.getMonth()].slice(0,3)} ${now.getFullYear()}`;

        const entries = [...history].reverse().concat([{ label: currentLabel, data: currentData }]);
        const labels  = entries.map(e => e.label.split(' ').slice(0,2).join(' '));

        const datasets = USERS.map(u => ({
            label:           u.charAt(0).toUpperCase() + u.slice(1),
            data:            entries.map(e => {
                const trips = e.data[u]?.trips || 0;
                const spent = e.data[u]?.spent || 0;
                return trips > 0 ? parseFloat((spent / trips).toFixed(2)) : 0;
            }),
            borderColor:     this._colors[u].border,
            backgroundColor: this._colors[u].bg,
            borderWidth:     2,
            pointRadius:     5,
            tension:         0.3,
            fill:            false
        }));

        const ctx = document.getElementById('chartAvgLine').getContext('2d');
        this._instances.avgLine = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: 'rgba(255,255,255,0.7)', padding: 16, font: { size: 13 } }
                    },
                    tooltip: {
                        callbacks: {
                            label(ctx) {
                                return ` ${ctx.dataset.label}: R$ ${ctx.raw.toFixed(2).replace('.', ',')}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: 'rgba(255,255,255,0.5)', callback: v => `R$${v.toFixed(0)}` },
                        grid:  { color: 'rgba(255,255,255,0.06)' }
                    },
                    x: {
                        ticks: { color: 'rgba(255,255,255,0.5)' },
                        grid:  { display: false }
                    }
                }
            }
        });
    }
};