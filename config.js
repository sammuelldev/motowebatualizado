/**
 * Configurações globais do Moto Diário
 */

const USERS = ['samuel', 'luan', 'kaio'];

const USER_EMOJIS = {
    samuel: '🤓',
    luan: '🧐',
    kaio: '😎'
};

const STORAGE_KEYS = {
    CURRENT_DATA: 'moto_diario_current',
    HISTORY:      'moto_diario_history',
    TRIPS_LOG:    'moto_diario_trips_log',
    LAST_RESET:   'moto_diario_last_reset'
};

const MONTH_NAMES = [
    'Janeiro','Fevereiro','Março','Abril',
    'Maio','Junho','Julho','Agosto',
    'Setembro','Outubro','Novembro','Dezembro'
];

const DEFAULT_DATA = {
    samuel: { trips: 0, spent: 0 },
    luan:   { trips: 0, spent: 0 },
    kaio:   { trips: 0, spent: 0 }
};
