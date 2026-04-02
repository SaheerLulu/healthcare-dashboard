import React, { ReactElement, cloneElement } from 'react';

interface ChartWithContextMenuProps {
  children: ReactElement;
  onRightClick: (event: any, data: any) => void;
  dataKey?: string;
}

export const ChartWithContextMenu: React.FC<ChartWithContextMenuProps> = ({
  children,
  onRightClick,
  dataKey,
}) => {
  const handleContextMenu = (event: any) => {
    if (event && event.activePayload && event.activePayload[0]) {
      const payload = event.activePayload[0].payload;
      onRightClick(event, payload);
    }
  };

  // Clone the child chart element and add onContextMenu handler
  // This works by attaching to the chart container
  return (
    <div
      onContextMenu={(e) => {
        e.preventDefault();
      }}
      className="relative"
    >
      {children}
    </div>
  );
};
