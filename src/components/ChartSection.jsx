import React from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import TradingViewWidget from './TradingViewWidget';

const ChartSection = ({ selectedSymbol = "BINANCE:BTCUSDT" }) => {

  return (
    <div className="flex flex-col flex-1 bg-[#0f0f0f] border border-[#222] rounded-sm p-2 h-full">
      {/* Chart Cont  ainer - RESIZABLE */}
      <div className="flex-1 relative min-h-[500px]">
        <PanelGroup direction="horizontal" className="h-full">
          <Panel defaultSize={100} minSize={50}>
            <div className="h-full">
              <PanelGroup direction="vertical" className="h-full">
                <Panel defaultSize={100} minSize={30}>
                  <div className="w-full h-full" style={{ minHeight: '500px', height: '100%' }}>
                    <TradingViewWidget symbol={selectedSymbol} />
                  </div>
                </Panel>
                
                {/* Vertical resize handle */}
                <PanelResizeHandle className="h-2 bg-gray-700 hover:bg-gray-600 transition-colors cursor-row-resize" />
                
                {/* Empty panel for vertical resize */}
                <Panel defaultSize={0} minSize={0} maxSize={70}>
                  <div className="h-full bg-transparent"></div>
                </Panel>
              </PanelGroup>
            </div>
          </Panel>
          
          {/* Horizontal resize handle */}
          <PanelResizeHandle className="w-2 bg-gray-700 hover:bg-gray-600 transition-colors cursor-col-resize" />
          
          {/* Empty panel for horizontal resize */}
          <Panel defaultSize={0} minSize={0} maxSize={50}>
            <div className="h-full bg-transparent"></div>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
};

export default ChartSection;