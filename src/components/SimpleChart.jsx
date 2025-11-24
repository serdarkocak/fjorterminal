import React from 'react';

const SimpleChart = ({ symbol, price, change, changePercent }) => {
  const isPositive = changePercent > 0;
  
  return (
    <div className="bg-[#0f0f0f] border border-[#222] rounded-sm flex-1 overflow-hidden flex flex-col h-full">
      {/* Chart Header */}
      <div className="flex items-center justify-between p-2 border-b border-[#222] bg-[#1a1a1a]">
        <div className="flex items-center space-x-2">
          <span className="text-white font-semibold">{symbol}</span>
          <span className={`text-sm px-2 py-1 rounded ${
            isPositive ? 'bg-green-700 text-green-400' : 'bg-red-700 text-red-400'
          }`}>
            {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
          </span>
        </div>
        <div className="text-white font-bold text-lg">
          ${price.toLocaleString('en-US', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
          })}
        </div>
      </div>

      {/* Simple Chart Placeholder */}
      <div className="flex-1 flex items-center justify-center p-8 min-h-[400px]">
        <div className="text-center">
          <div className="text-gray-400 text-lg mb-4">
            📊 Simple Chart View
          </div>
          <div className="text-gray-500 text-sm mb-4">
            TradingView widget is not available in free plan.
          </div>
          <div className="text-gray-600 text-xs">
            This is a placeholder for the chart.
            <br />
            Consider upgrading to TradingView Pro for full features.
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleChart;
