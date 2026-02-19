export interface HistoryItem {
    id: string;
    fileName: string;
    fileType: string; // e.g., 'image/png'
    resultType: string; // e.g., 'image/webp'
    timestamp: number;
    size: number;
}

const HISTORY_KEY = 'file_converter_history';

export const saveHistory = (item: HistoryItem) => {
    const history = getHistory();
    history.unshift(item);
    // Limit to 50 items
    if (history.length > 50) {
        history.pop();
    }
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    // Dispatch custom event for real-time updates across tabs/components
    window.dispatchEvent(new Event('historyUpdated'));
};

export const getHistory = (): HistoryItem[] => {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
};

export const clearHistory = () => {
    localStorage.removeItem(HISTORY_KEY);
    window.dispatchEvent(new Event('historyUpdated'));
};
