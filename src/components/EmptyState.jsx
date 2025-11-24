import React from 'react';
import { 
  Inbox, 
  AlertCircle, 
  Search, 
  TrendingUp, 
  Settings, 
  Newspaper,
  Wallet,
  LineChart
} from 'lucide-react';

/**
 * EmptyState Component
 * Shows helpful messages when there's no data to display
 */

const EmptyState = ({ 
  icon: Icon = Inbox,
  title = 'No Data Available',
  description = 'There is nothing to show here yet.',
  action,
  actionLabel = 'Get Started',
  iconColor = 'text-gray-500',
  size = 'md'
}) => {
  const sizeClasses = {
    sm: {
      container: 'py-6',
      icon: 'w-12 h-12',
      title: 'text-base',
      description: 'text-xs',
      button: 'text-xs px-3 py-1.5'
    },
    md: {
      container: 'py-12',
      icon: 'w-16 h-16',
      title: 'text-lg',
      description: 'text-sm',
      button: 'text-sm px-4 py-2'
    },
    lg: {
      container: 'py-20',
      icon: 'w-24 h-24',
      title: 'text-xl',
      description: 'text-base',
      button: 'text-base px-6 py-3'
    }
  };

  const classes = sizeClasses[size];

  return (
    <div className={`flex flex-col items-center justify-center text-center ${classes.container}`}>
      <div className={`${iconColor} mb-4 opacity-50`}>
        <Icon className={classes.icon} />
      </div>
      <h3 className={`${classes.title} font-semibold text-white mb-2`}>
        {title}
      </h3>
      <p className={`${classes.description} text-gray-400 mb-6 max-w-md`}>
        {description}
      </p>
      {action && (
        <button
          onClick={action}
          className={`${classes.button} bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200`}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

// Predefined Empty States for common scenarios

export const NoPositionsState = ({ onAddPosition }) => (
  <EmptyState
    icon={LineChart}
    title="No Open Positions"
    description="You don't have any open positions yet. Start trading to see your positions here."
    action={onAddPosition}
    actionLabel="Open Position"
    iconColor="text-blue-500"
  />
);

export const NoNewsState = ({ onRefresh }) => (
  <EmptyState
    icon={Newspaper}
    title="No News Available"
    description="We couldn't fetch any news at the moment. Check your connection and try again."
    action={onRefresh}
    actionLabel="Refresh News"
    iconColor="text-yellow-500"
  />
);

export const NoSearchResultsState = ({ searchTerm, onClear }) => (
  <EmptyState
    icon={Search}
    title="No Results Found"
    description={`No results found for "${searchTerm}". Try a different search term.`}
    action={onClear}
    actionLabel="Clear Search"
    iconColor="text-gray-500"
    size="sm"
  />
);

export const NoWalletState = ({ onConnect }) => (
  <EmptyState
    icon={Wallet}
    title="No Wallet Connected"
    description="Connect your Binance API key to view your wallet balance and start trading."
    action={onConnect}
    actionLabel="Connect API Key"
    iconColor="text-green-500"
  />
);

export const NoTickersState = ({ onAddTickers }) => (
  <EmptyState
    icon={TrendingUp}
    title="No Ticker Shortcuts"
    description="Add your favorite ticker shortcuts to quickly monitor price movements."
    action={onAddTickers}
    actionLabel="Add Tickers"
    iconColor="text-purple-500"
  />
);

export const ErrorState = ({ error, onRetry }) => (
  <EmptyState
    icon={AlertCircle}
    title="Something Went Wrong"
    description={error || "An unexpected error occurred. Please try again."}
    action={onRetry}
    actionLabel="Try Again"
    iconColor="text-red-500"
  />
);

export const NoConfigState = ({ onConfigure }) => (
  <EmptyState
    icon={Settings}
    title="Configuration Required"
    description="Please configure your settings to get started with this feature."
    action={onConfigure}
    actionLabel="Go to Settings"
    iconColor="text-orange-500"
  />
);

export default EmptyState;

