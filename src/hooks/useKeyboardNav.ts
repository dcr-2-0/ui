import { useCallback, type RefObject } from 'react';

export function useKeyboardNav(containerRef: RefObject<HTMLElement | null>) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const items = Array.from(
        container.querySelectorAll<HTMLButtonElement>('.nav-link')
      );
      if (items.length === 0) return;

      const currentIndex = items.findIndex((el) => el === document.activeElement);

      let nextIndex: number | null = null;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
          break;
        case 'ArrowUp':
          e.preventDefault();
          nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
          break;
        case 'Home':
          e.preventDefault();
          nextIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          nextIndex = items.length - 1;
          break;
      }

      if (nextIndex !== null) {
        items[nextIndex].focus();
      }
    },
    [containerRef]
  );

  return handleKeyDown;
}
