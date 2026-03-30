import { useState, useCallback, useMemo } from 'react';
import type { CatalogItem } from '../data/types';

const STORAGE_KEY = 'dcr-simulator-cart';

function loadCart(): CatalogItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCart(items: CatalogItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function useSimulatorCart() {
  const [items, setItems] = useState<CatalogItem[]>(loadCart);

  const addItem = useCallback((item: CatalogItem) => {
    setItems((prev) => {
      // Non-repeatable: prevent duplicates
      if (!item.repeatable && prev.some((i) => i.id === item.id)) return prev;
      // Repeatable: always append another occurrence
      const next = [...prev, item];
      saveCart(next);
      return next;
    });
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setItems((prev) => {
      // Remove last occurrence only (correct for repeatable items)
      const idx = [...prev].reverse().findIndex((i) => i.id === itemId);
      if (idx === -1) return prev;
      const realIdx = prev.length - 1 - idx;
      const next = [...prev.slice(0, realIdx), ...prev.slice(realIdx + 1)];
      saveCart(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setItems([]);
    saveCart([]);
  }, []);

  const isInCart = useCallback(
    (itemId: string) => items.some((i) => i.id === itemId),
    [items],
  );

  const getQuantity = useCallback(
    (itemId: string) => items.filter((i) => i.id === itemId).length,
    [items],
  );

  const toggleItem = useCallback(
    (item: CatalogItem) => {
      if (isInCart(item.id)) {
        removeItem(item.id);
      } else {
        addItem(item);
      }
    },
    [isInCart, removeItem, addItem],
  );

  const totalPoints = useMemo(
    () => items.reduce((sum, i) => sum + (i.promotedPoints ?? i.points), 0),
    [items],
  );

  const totalItems = items.length;

  return {
    items,
    addItem,
    removeItem,
    clearAll,
    isInCart,
    getQuantity,
    toggleItem,
    totalPoints,
    totalItems,
  };
}