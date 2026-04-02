import { useState, useCallback, MouseEvent } from 'react';

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  data: any;
  type: string;
}

export const useChartContextMenu = () => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    data: null,
    type: '',
  });

  const handleChartRightClick = useCallback((event: any, data: any, type: string) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Get the mouse position relative to the viewport
    const x = event.clientX;
    const y = event.clientY;

    setContextMenu({
      visible: true,
      x,
      y,
      data,
      type,
    });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  }, []);

  return {
    contextMenu,
    handleChartRightClick,
    closeContextMenu,
  };
};
