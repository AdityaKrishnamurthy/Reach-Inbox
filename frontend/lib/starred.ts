// Client-only "starred" bookmarking for emails, persisted in localStorage
// rather than the backend since it is a personal, browser-local UI
// preference. Toggling a star fires a "reachinbox:star-changed" DOM event so
// other mounted components (sidebar count, list rows) can react immediately.

const STARRED_KEY = 'reachinbox_starred_emails';

export const getStarredEmailIds = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STARRED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const isEmailStarred = (id: string): boolean => {
  const ids = getStarredEmailIds();
  return ids.includes(id);
};

export const toggleEmailStar = (id: string): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const ids = getStarredEmailIds();
    const isCurrentlyStarred = ids.includes(id);
    const newIds = isCurrentlyStarred ? ids.filter((item) => item !== id) : [...ids, id];
    localStorage.setItem(STARRED_KEY, JSON.stringify(newIds));
    window.dispatchEvent(
      new CustomEvent('reachinbox:star-changed', { detail: { id, isStarred: !isCurrentlyStarred } })
    );
    return !isCurrentlyStarred;
  } catch {
    return false;
  }
};
