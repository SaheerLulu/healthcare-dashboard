import React from 'react';
import { AlertCircle, Filter, RefreshCw } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  type?: 'no-data' | 'no-match' | 'error';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  icon,
  action,
  type = 'no-data',
}) => {
  const getDefaultIcon = () => {
    switch (type) {
      case 'no-match':
        return <Filter className="w-12 h-12 text-gray-400" />;
      case 'error':
        return <AlertCircle className="w-12 h-12 text-red-400" />;
      default:
        return (
          <svg
            className="w-12 h-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        );
    }
  };

  const getDefaultTitle = () => {
    switch (type) {
      case 'no-match':
        return 'No matching data';
      case 'error':
        return 'Error loading data';
      default:
        return 'No data available';
    }
  };

  const getDefaultMessage = () => {
    switch (type) {
      case 'no-match':
        return 'Try adjusting your filters or selections';
      case 'error':
        return 'An error occurred while loading the data. Please try again.';
      default:
        return 'There is no data to display for the selected period';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="mb-4">{icon || getDefaultIcon()}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {title || getDefaultTitle()}
      </h3>
      <p className="text-sm text-gray-500 mb-4 max-w-md">
        {message || getDefaultMessage()}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
        >
          {type === 'error' && <RefreshCw className="w-4 h-4" />}
          {action.label}
        </button>
      )}
    </div>
  );
};

export const NoMatchingData: React.FC<{ filterName?: string; onClear?: () => void }> = ({
  filterName,
  onClear,
}) => {
  return (
    <EmptyState
      type="no-match"
      title="No matching data"
      message={
        filterName
          ? `No data found for the selected ${filterName}`
          : 'No data matches your current filters or selections'
      }
      action={
        onClear
          ? {
              label: 'Clear Selection',
              onClick: onClear,
            }
          : undefined
      }
    />
  );
};
