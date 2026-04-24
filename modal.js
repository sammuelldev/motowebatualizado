/**
 * Controle da Modal de Adicionar Viagem
 */

const Modal = {
    currentUser:  null,
    isProcessing: false,

    elements: {
        overlay: document.getElementById('modalOverlay'),
        icon:    document.getElementById('modalIcon'),
        title:   document.getElementById('modalTitle'),
        amount:  document.getElementById('modalAmount'),
        confirm: document.getElementById('modalConfirm'),
        close:   document.getElementById('modalClose'),
        error:   document.getElementById('modalError')
    },

    open(username) {
        this.currentUser  = username;
        this.isProcessing = false;

        this.elements.icon.textContent  = USER_EMOJIS[username];
        this.elements.title.textContent = username.charAt(0).toUpperCase() + username.slice(1);
        this.elements.amount.value      = '';
        this.elements.error.classList.add('hidden');
        this.elements.confirm.disabled      = false;
        this.elements.confirm.textContent   = '✅ Confirmar Viagem';
        this.elements.overlay.classList.remove('hidden');

        setTimeout(() => this.elements.amount.focus(), 80);
    },

    close() {
        this.elements.overlay.classList.add('hidden');
        this.elements.amount.value    = '';
        this.elements.error.classList.add('hidden');
        this.elements.confirm.disabled    = false;
        this.elements.confirm.textContent = '✅ Confirmar Viagem';
        this.currentUser  = null;
        this.isProcessing = false;
    },

    confirm() {
        if (this.isProcessing) return;

        const value = parseFloat(this.elements.amount.value);
        if (isNaN(value) || value <= 0) {
            this.elements.error.classList.remove('hidden');
            this.elements.amount.classList.add('error-shake');
            setTimeout(() => this.elements.amount.classList.remove('error-shake'), 500);
            return;
        }

        this.isProcessing             = true;
        this.elements.confirm.disabled    = true;
        this.elements.confirm.textContent = '⏳ Salvando...';

        const username   = this.currentUser;
        const { data }   = Storage.addTrip(username, value);

        const card = document.querySelector(`[data-user="${username}"]`);
        if (card) {
            card.classList.add('pulse-animation');
            setTimeout(() => card.classList.remove('pulse-animation'), 400);
        }

        UI.updateHome(data);
        Rankings.update();
        UI.renderTripsFeed();   // ← atualiza feed em tempo real

        this.close();
    },

    init() {
        // Clona botões para evitar listeners duplicados
        ['confirm','close'].forEach(key => {
            const el    = this.elements[key];
            const fresh = el.cloneNode(true);
            el.parentNode.replaceChild(fresh, el);
            this.elements[key] = fresh;
        });

        this.elements.confirm.addEventListener('click', () => this.confirm());
        this.elements.close.addEventListener('click',   () => this.close());

        this.elements.overlay.addEventListener('click', e => {
            if (e.target === this.elements.overlay) this.close();
        });

        this.elements.amount.addEventListener('keypress', e => {
            if (e.key === 'Enter') this.confirm();
        });

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && !this.elements.overlay.classList.contains('hidden')) {
                this.close();
            }
        });
    }
};
