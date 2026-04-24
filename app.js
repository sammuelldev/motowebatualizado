/**
 * Arquivo principal
 */

(function () {
    'use strict';

    // ── Zera tudo na primeira carga (garante slate limpo) ─────────────────────
    Storage.hardReset();

    // ── Verifica virada de mês a cada 5 minutos (sem precisar recarregar) ────
    setInterval(() => {
        const resetou = Storage.checkMonthlyReset();
        if (resetou) {
            UI.updateHome(Storage.getCurrentData());
            Rankings.update();
            UI.renderTripsFeed();
            UI.showToast('Novo mês iniciado! Dados do mês anterior salvos no Histórico.', 'success');
        }
    }, 5 * 60 * 1000);

    // ── Inicializa módulos ────────────────────────────────────────────────────
    Modal.init();

    const data = Storage.getCurrentData();
    UI.updateHome(data);

    // ── Menu toggle ───────────────────────────────────────────────────────────
    UI.elements.menuToggle.addEventListener('click', e => {
        e.stopPropagation();
        UI.elements.menuDropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', e => {
        if (!e.target.closest('.top-menu')) {
            UI.elements.menuDropdown.classList.add('hidden');
        }
    });

    // ── Navegação ─────────────────────────────────────────────────────────────
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', () => {
            const section = item.dataset.section;
            UI.elements.menuDropdown.classList.add('hidden');

            UI.showSection(section);

            if (section === 'home') {
                UI.updateHome(Storage.getCurrentData());

            } else if (section === 'rankings') {
                Rankings.update();

            } else if (section === 'trips') {
                UI.renderTripsFeed();

            } else if (section === 'history') {
                UI.elements.historyDetail.classList.add('hidden');
                UI.renderHistory();
            }
        });
    });

    // ── Click nos cards abre modal ────────────────────────────────────────────
    document.querySelectorAll('.user-card').forEach(card => {
        card.addEventListener('click', e => {
            if (e.target.closest('.btn-remove')) return;
            const username = card.dataset.user;
            if (username) Modal.open(username);
        });
    });

    // ── Botões desfazer ───────────────────────────────────────────────────────
    document.querySelectorAll('.btn-remove').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const username = btn.dataset.user;
            if (username) UI.removeLastTrip(username);
        });
    });

    console.log('✅ Moto Diário v2 inicializado — dados zerados.');
})();
