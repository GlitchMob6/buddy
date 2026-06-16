import { useState, useEffect } from 'react';

const STORAGE_KEY = 'buddy_custom_categories';

export function useCustomCategories() {
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Failed to parse custom categories', e);
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customCategories));
  }, [customCategories]);

  const addCustomCategory = (cat: string) => {
    const trimmed = cat.trim();
    if (!trimmed) return;
    setCustomCategories(prev => {
      if (prev.includes(trimmed)) return prev;
      return [...prev, trimmed].sort((a, b) => a.localeCompare(b));
    });
  };

  const removeCustomCategory = (cat: string) => {
    setCustomCategories(prev => prev.filter(c => c !== cat));
  };

  return {
    customCategories,
    addCustomCategory,
    removeCustomCategory,
  };
}
