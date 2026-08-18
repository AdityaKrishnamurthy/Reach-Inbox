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
