import React, { useState, useEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, AlertCircle, Info, XCircle } from 'lucide-react';

const NotificationItem = memo(({ notification, onRemove, index }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Progress bar animation
  useEffect(() => {
    if (notification.duration && notification.duration > 0) {
      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 100 - (elapsed / notification.duration) * 100);
        setProgress(remaining);
        
        if (remaining <= 0) {
          clearInterval(interval);
        }
      }, 50);

      return () => clearInterval(interval);
    }
  }, [notification.duration]);

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-400" />;
      default:
        return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const getBorderColor = () => {
    switch (notification.type) {
      case 'success':
        return 'border-green-500';
      case 'error':
        return 'border-red-500';
      case 'warning':
        return 'border-yellow-500';
      default:
        return 'border-blue-500';
    }
  };

  const getProgressColor = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'warning':
        return 'bg-yellow-500';
      default:
        return 'bg-blue-500';
    }
  };

  return (
    <div
      className={`relative bg-[#1a1a1a] border-l-4 ${getBorderColor()} rounded-lg shadow-2xl overflow-hidden min-w-[320px] max-w-[400px] transform transition-all duration-300 mb-3 backdrop-blur-sm ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
      style={{ marginTop: index > 0 ? '12px' : '0' }}
    >
      {/* Progress bar */}
      {notification.duration && notification.duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800">
          <div
            className={`h-full ${getProgressColor()} transition-all duration-100 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white font-semibold text-sm mb-1">
              {notification.title}
            </div>
            {notification.message && (
              <div className="text-gray-300 text-xs mb-2 leading-relaxed">
                {notification.message}
              </div>
            )}
            {notification.details && (
              <div className="text-gray-400 text-xs space-y-1 bg-black/20 rounded p-2 mt-2">
                {Object.entries(notification.details).map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-2">
                    <span className="capitalize text-gray-500">{key}:</span>
                    <span className="text-white font-mono">{value}</span>
                  </div>
                ))}
              </div>
            )}
            {notification.action && (
              <button
                onClick={() => {
                  notification.action.onClick();
                  onRemove(notification.id);
                }}
                className="mt-3 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
              >
                {notification.action.label}
              </button>
            )}
          </div>
          <button
            onClick={() => onRemove(notification.id)}
            className="flex-shrink-0 text-gray-400 hover:text-white transition-colors hover:bg-white/10 rounded p-1"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
});

NotificationItem.displayName = 'NotificationItem';

const NotificationSystem = () => {
  const [notifications, setNotifications] = useState([]);

  // Listen for custom notification events
  useEffect(() => {
    const handleNotification = (event) => {
      const { type, title, message, details, duration = 5000, action } = event.detail;
      
      const notification = {
        id: Date.now() + Math.random(),
        type,
        title,
        message,
        details,
        duration,
        action,
        timestamp: new Date().toISOString()
      };

      setNotifications(prev => [...prev, notification]);

      // Auto remove after duration
      if (duration > 0) {
        setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== notification.id));
        }, duration);
      }
    };

    window.addEventListener('showNotification', handleNotification);
    
    return () => {
      window.removeEventListener('showNotification', handleNotification);
    };
  }, []);

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };
  
  return createPortal(
    <div className="fixed top-4 right-4 z-[9999] pointer-events-none max-w-[420px]" style={{ zIndex: 999999 }}>
      <div className="flex flex-col space-y-3 pointer-events-auto">
        {notifications.map((notification, index) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onRemove={removeNotification}
            index={index}
          />
        ))}
      </div>
    </div>,
    document.body
  );
};

// Helper function to show notifications
export const showNotification = (type, title, message, details, duration, action) => {
  const event = new CustomEvent('showNotification', {
    detail: { type, title, message, details, duration, action }
  });
  window.dispatchEvent(event);
};

// Convenience functions
export const showSuccess = (title, message, details, duration = 5000, action) => {
  showNotification('success', title, message, details, duration, action);
};

export const showError = (title, message, details, duration = 7000, action) => {
  showNotification('error', title, message, details, duration, action);
};

export const showWarning = (title, message, details, duration = 6000, action) => {
  showNotification('warning', title, message, details, duration, action);
};

export const showInfo = (title, message, details, duration = 5000, action) => {
  showNotification('info', title, message, details, duration, action);
};

export default NotificationSystem;
