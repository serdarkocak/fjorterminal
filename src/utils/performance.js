/**
 * Performance Utilities
 * Helper functions for optimizing React performance
 */

// Debounce function - delays function execution until after wait time
export const debounce = (func, wait = 300) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Throttle function - limits function execution to once per wait time
export const throttle = (func, wait = 300) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), wait);
    }
  };
};

// Check if two objects are shallowly equal (for React.memo)
export const shallowEqual = (obj1, obj2) => {
  if (obj1 === obj2) return true;
  
  if (typeof obj1 !== 'object' || obj1 === null ||
      typeof obj2 !== 'object' || obj2 === null) {
    return false;
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (let key of keys1) {
    if (obj1[key] !== obj2[key]) return false;
  }

  return true;
};

// Deep comparison for props (useful for complex props)
export const deepEqual = (obj1, obj2) => {
  if (obj1 === obj2) return true;

  if (typeof obj1 !== 'object' || obj1 === null ||
      typeof obj2 !== 'object' || obj2 === null) {
    return obj1 === obj2;
  }

  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    if (obj1.length !== obj2.length) return false;
    return obj1.every((item, index) => deepEqual(item, obj2[index]));
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  return keys1.every(key => deepEqual(obj1[key], obj2[key]));
};

// Measure component render time (development only)
export const measureRenderTime = (componentName) => {
  if (import.meta.env.DEV) {
    const startTime = performance.now();
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      if (renderTime > 16) { // More than one frame (60fps)
        console.warn(`⚠️ ${componentName} took ${renderTime.toFixed(2)}ms to render`);
      }
    };
  }
  return () => {};
};

// Lazy load images with intersection observer
export const lazyLoadImage = (imageElement, src) => {
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const image = entry.target;
          image.src = src;
          image.classList.remove('lazy');
          imageObserver.unobserve(image);
        }
      });
    });
    imageObserver.observe(imageElement);
  } else {
    // Fallback for browsers that don't support IntersectionObserver
    imageElement.src = src;
  }
};

// Memoize expensive calculations
export const memoize = (fn) => {
  const cache = new Map();
  return (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};

// Request Animation Frame throttle for smooth animations
export const rafThrottle = (callback) => {
  let requestId = null;
  let lastArgs;

  const later = (context) => () => {
    requestId = null;
    callback.apply(context, lastArgs);
  };

  const throttled = function (...args) {
    lastArgs = args;
    if (requestId === null) {
      requestId = requestAnimationFrame(later(this));
    }
  };

  throttled.cancel = () => {
    if (requestId !== null) {
      cancelAnimationFrame(requestId);
      requestId = null;
    }
  };

  return throttled;
};

// Batch state updates for better performance
export const batchUpdates = (callback) => {
  // React 18+ automatically batches updates
  // This is a fallback for older versions
  if (typeof queueMicrotask !== 'undefined') {
    queueMicrotask(callback);
  } else {
    Promise.resolve().then(callback);
  }
};

export default {
  debounce,
  throttle,
  shallowEqual,
  deepEqual,
  measureRenderTime,
  lazyLoadImage,
  memoize,
  rafThrottle,
  batchUpdates
};

