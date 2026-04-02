import React, { ReactNode, MouseEvent } from 'react';

interface ChartContainerProps {
  children: ReactNode;
  onRightClick: (event: MouseEvent, data?: any) => void;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({ children, onRightClick }) => {
  const handleContextMenu = (event: MouseEvent) => {
    event.preventDefault();
    onRightClick(event);
  };

  return (
    <div
      onContextMenu={handleContextMenu}
      className="relative w-full h-full"
      style={{ userSelect: 'none' }}
    >
      {children}
    </div>
  );
};
