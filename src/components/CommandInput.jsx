import React, { useState, useRef, useEffect } from 'react';
import { showError } from './NotificationSystem';
import FjorTerminalLogo from './FjorTerminalLogo';

const CommandInput = ({ onTradeExecute }) => {
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const textareaRef = useRef(null);

  // Parse trading command
  const parseTradingCommand = (cmd) => {
    const cleanCmd = cmd.trim().toLowerCase();
    const parts = cleanCmd.split(/\s+/);
    
    if (parts.length < 2) {
      throw new Error('Invalid command format. Use: SYMBOL AMOUNT [LONG|SHORT]');
    }

    const symbol = parts[0].toUpperCase();
    const amount = parseFloat(parts[1]);
    const side = parts[2] || 'long'; // Default to long if not specified

    // Validate symbol (should be 2-5 characters, common crypto symbols)
    if (symbol.length < 2 || symbol.length > 5) {
      throw new Error('Invalid symbol format. Use 2-5 characters (e.g., BTC, ETH, AVAX)');
    }

    // Validate amount (should be positive number)
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Invalid amount. Must be a positive number (minimum $5)');
    }

    // Validate minimum amount
    if (amount < 5) {
      throw new Error('Minimum amount is $5 USD');
    }

    // Validate side (more flexible)
    const validSides = ['long', 'short', 'l', 's', 'buy', 'sell', 'b', 'sell'];
    if (!validSides.includes(side)) {
      throw new Error('Invalid side. Use: LONG, SHORT, L, S, BUY, SELL, B');
    }

    // Convert side to standard format
    let normalizedSide = 'long';
    if (['short', 's', 'sell'].includes(side)) {
      normalizedSide = 'short';
    }

    return {
      symbol: symbol + 'USDT', // Add USDT suffix
      side: normalizedSide,
      amount: amount,
      type: 'market' // Default to market order
    };
  };

  // Execute trading command
  const executeTradingCommand = async (cmd) => {
    try {
      const tradeData = parseTradingCommand(cmd);

      // Execute trade via backend (notification will be shown by handleTradeExecute)
      if (onTradeExecute) {
        const side = tradeData.side === 'long' ? 'BUY' : 'SELL';
        const positionSide = tradeData.side === 'long' ? 'LONG' : 'SHORT';
        
        await onTradeExecute({
          symbol: tradeData.symbol,
          side: side,
          type: 'MARKET',
          usdAmount: tradeData.amount,
          quantity: tradeData.amount, // Will be calculated from USD amount
          positionSide: positionSide // Required for Hedge Mode
        });
      }

    } catch (error) {
      showError(
        'Command Error',
        error.message,
        {
          'Command': cmd,
          'Format': 'SYMBOL AMOUNT [LONG|SHORT]',
          'Examples': 'BTC 100 LONG, ETH 50 SHORT, AVAX 25 L, SOL 75 BUY, ADA 30 S'
        },
        5000
      );
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (command.trim()) {
        setHistory(prev => [...prev, command]);
        setCommand('');
        setHistoryIndex(-1);
        
        // Execute trading command
        executeTradingCommand(command);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCommand(history[history.length - 1 - newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCommand(history[history.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommand('');
      }
    }
  };

  const handleInput = (e) => {
    setCommand(e.target.value);
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [command]);

  return (
    <div 
      className="bg-[#0f0f0f] border border-[#222] rounded-sm p-1 font-mono text-[10px] text-gray-300 h-full overflow-y-auto"
    >
      {/* Header with logo and help text */}
      <div className="flex items-center justify-between mb-1 px-1">
        <FjorTerminalLogo size={16} showText={false} className="opacity-60" />
        <div className="text-gray-500 text-[12px] flex-1 ml-2">
          Trading Commands: SYMBOL AMOUNT [LONG|SHORT] | Examples: btc 100 long, avax 5 short, eth 50 l, sol 75 buy, ada 30 s
        </div>
      </div>
      
      <div className="flex items-start space-x-1 text-[12px]">
        <span className="text-gray-400 flex-shrink-0">$</span>
        <textarea
          ref={textareaRef}
          value={command}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="avax 5 short"
          className="flex-1 bg-transparent border-none outline-none resize-none text-gray-300 placeholder-gray-500"
          style={{ minHeight: '20px' }}
          spellCheck={false}
        />
      </div>
      
      {/* Command history preview */}
      {history.length > 0 && (
        <div className="mt-2 px-1">
          <div className="text-gray-600 text-[8px] mb-1">Recent commands:</div>
          <div className="space-y-0.5 max-h-16 overflow-y-auto">
            {history.slice(-3).map((cmd, index) => (
              <div key={index} className="text-gray-400 text-[8px]">
                {cmd}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CommandInput;
