import { useRef, useMemo } from 'react';

// Hook pour stabiliser les données et éviter les recalculs inutiles
export const useStableData = <T>(data: T, compareFn?: (prev: T, next: T) => boolean): T => {
    const prevDataRef = useRef<T>(data);
    
    return useMemo(() => {
        if (compareFn) {
            if (!compareFn(prevDataRef.current, data)) {
                prevDataRef.current = data;
            }
        } else {
            // Comparaison par défaut (shallow)
            if (JSON.stringify(prevDataRef.current) !== JSON.stringify(data)) {
                prevDataRef.current = data;
            }
        }
        return prevDataRef.current;
    }, [data, compareFn]);
};

// Hook pour éviter les re-renders inutiles avec debounce
export const useDebounceCallback = <T extends (...args: any[]) => any>(
    callback: T,
    delay: number,
    deps: React.DependencyList
): T => {
    const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
    
    return useMemo(() => {
        return ((...args: Parameters<T>) => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            timeoutRef.current = setTimeout(() => {
                callback(...args);
            }, delay);
        }) as T;
    }, [callback, delay, ...deps]);
};