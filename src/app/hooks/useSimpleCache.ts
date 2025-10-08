import { useState, useEffect } from 'react';

// Cache simple pour petits établissements
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

export const useSimpleCache = <T>(key: string, fetcher: () => T | Promise<T>, ttl = 300000) => {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            const cached = cache.get(key);
            const now = Date.now();
            
            if (cached && now - cached.timestamp < cached.ttl) {
                setData(cached.data);
                setLoading(false);
                return;
            }

            try {
                const result = await fetcher();
                cache.set(key, { data: result, timestamp: now, ttl });
                setData(result);
            } catch (error) {
                console.warn('Cache fetch error:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [key, ttl]);

    return { data, loading };
};