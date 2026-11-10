import { useEffect, useRef } from 'react';

/**
 * Breite eines rechten Seitenpanels mit der Maus ziehen (Anfasser links am Panel).
 * @param {{ width: number, onWidthChange: (width: number) => void }} options
 * @returns {(event: { clientX: number }) => void} Start des Ziehens (onMouseDown des Anfassers)
 */
export function usePanelResize({ width, onWidthChange }) {
  const stateRef = useRef({ isActive: false, startX: 0, startWidth: width });
  const onWidthChangeRef = useRef(onWidthChange);
  useEffect(() => {
    onWidthChangeRef.current = onWidthChange;
  });

  useEffect(() => {
    const handleMouseMove = (event) => {
      if (!stateRef.current.isActive) return;
      const delta = stateRef.current.startX - event.clientX;
      onWidthChangeRef.current(stateRef.current.startWidth + delta);
    };
    const handleMouseUp = () => {
      stateRef.current.isActive = false;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (event) => {
    stateRef.current = { isActive: true, startX: event.clientX, startWidth: width };
  };
}
