import { useRef, useCallback } from 'react';

/**
 * Custom hook for caching API responses to avoid redundant requests
 * @returns {Object} Cache utilities
 */
export const useRecordsCache = () => {
  const cacheRef = useRef(new Map());
  const timestampRef = useRef(new Map());
  const CACHE_DURATION = 30000; // 30 seconds cache

  /**
   * Get cached data if valid
   * @param {string} key - Cache key
   * @returns {any|null} Cached data or null if expired/not found
   */
  const getCached = useCallback((key) => {
    if (!cacheRef.current.has(key)) {
      return null;
    }

    const timestamp = timestampRef.current.get(key);
    const now = Date.now();

    // Check if cache is still valid
    if (now - timestamp > CACHE_DURATION) {
      cacheRef.current.delete(key);
      timestampRef.current.delete(key);
      return null;
    }

    return cacheRef.current.get(key);
  }, []);

  /**
   * Set data in cache
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   */
  const setCache = useCallback((key, data) => {
    cacheRef.current.set(key, data);
    timestampRef.current.set(key, Date.now());
  }, []);

  /**
   * Clear specific cache entry
   * @param {string} key - Cache key to clear
   */
  const clearCache = useCallback((key) => {
    if (key) {
      cacheRef.current.delete(key);
      timestampRef.current.delete(key);
    } else {
      // Clear all cache
      cacheRef.current.clear();
      timestampRef.current.clear();
    }
  }, []);

  /**
   * Generate cache key from filters
   * @param {Object} filters - Filter object
   * @returns {string} Cache key
   */
  const generateKey = useCallback((filters) => {
    return JSON.stringify(filters);
  }, []);

  return {
    getCached,
    setCache,
    clearCache,
    generateKey
  };
};
