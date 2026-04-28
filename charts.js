/**
 * Gráficos — Chart.js
 * Três gráficos: barras (viagens), pizza (gastos), linha (média histórica)
 */

const Charts = {
    _instances: {},

    // Cores fixas por usuário
    _colors: {
        samuel: { bg: 'rgba(74,160,255,0.7)',  border: '#4aa0ff' },
        luan:   { bg: 'rgba(74,222,128,0.7)',  border: '#4ade80' },
        kaio:   { bg: 'rgba(251,191,36,0.7)',  border: '#fbbf24' }
    },

    // Destrói instância anterior antes de recriar (evita o erro "canvas already in use")
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

    // ── Gráfico 1: Barras — viagens por pessoa no mês atual ──────────────────
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
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: 'rgba(255,255,255,0.7)',
                            stepSize: 1
                        },
                        grid: { color: 'rgba(255,255,255,0.08)' }
                    },
                    x: {
                        ticks: { color: 'rgba(255,255,255,0.8)', font: { size: 14 } },
                        grid: { display: false }
                    }
                }
            }
        });
    },

    // ── Gráfico 2: Pizza — gastos por pessoa no mês atual ────────────────────
    _renderSpentPie() {
        this._destroy('spentPie');

        const data    = Storage.getCurrentData();
        const labels  = USERS.map(u => u.charAt(0).toUpperCase() + u.slice(1));
        const values  = USERS.map(u => data[u]?.spent || 0);
        const colors  = USERS.map(u => this._colors[u].bg);
        const borders = USERS.map(u => this._colors[u].border);

        const total = values.reduce((a, b) => a + b, 0);

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
                        labels: {
                            color: 'rgba(255,255,255,0.8)',
                            padding: 16,
                            font: { size: 13 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label(ctx) {
                                if (total === 0) return ' Sem dados';
                                const val = ctx.raw;
                                const pct = ((val / total) * 100).toFixed(1);
                                return ` R$ ${val.toFixed(2).replace('.', ',')} (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });
    },

    // ── Gráfico 3: Linha — gasto médio por viagem no histórico ───────────────
    _renderAvgLine() {
        this._destroy('avgLine');

        const history = Storage.getHistory();

        // Inclui mês atual no final
        const currentData  = Storage.getCurrentData();
        const now          = new Date();
        const currentLabel = `${MONTH_NAMES[now.getMonth()].slice(0,3)} ${now.getFullYear()}`;

        // Monta array: histórico (do mais antigo pro mais recente) + mês atual
        const entries = [...history].reverse().concat([{
            label: currentLabel,
            data:  currentData
        }]);

        const labels = entries.map(e => e.label.split(' ').slice(0,2).join(' '));

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
                        labels: {
                            color: 'rgba(255,255,255,0.8)',
                            padding: 16,
                            font: { size: 13 }
                        }
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
                        ticks: {
                            color: 'rgba(255,255,255,0.7)',
                            callback: v => `R$ ${v.toFixed(0)}`
                        },
                        grid: { color: 'rgba(255,255,255,0.08)' }
                    },
                    x: {
                        ticks: { color: 'rgba(255,255,255,0.7)' },
                        grid: { display: false }
                    }
                }
            }
        });
    }
};7