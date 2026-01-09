import { API_URL } from '@/constants/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

interface QueueItem {
    id: string;
    type: 'ADD_TRANSACTION' | 'ADD_BILL';
    payload: any;
    timestamp: number;
}

interface OfflineContextType {
    isOffline: boolean;
    queue: QueueItem[];
    addToQueue: (type: 'ADD_TRANSACTION' | 'ADD_BILL', payload: any) => Promise<void>;
    processQueue: () => Promise<void>;
    checkConnection: () => Promise<boolean>;
}

const OfflineContext = createContext<OfflineContextType>({
    isOffline: false,
    queue: [],
    addToQueue: async () => { },
    processQueue: async () => { },
    checkConnection: async () => false,
});

export const useOffline = () => useContext(OfflineContext);

export const OfflineProvider = ({ children }: { children: React.ReactNode }) => {
    const [isOffline, setIsOffline] = useState(false);
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const { user } = useAuth(); // Need user for API calls if required, though payload usually has it

    // Load queue on mount
    useEffect(() => {
        const loadQueue = async () => {
            try {
                const storedQueue = await AsyncStorage.getItem('offlineQueue');
                if (storedQueue) {
                    setQueue(JSON.parse(storedQueue));
                }
            } catch (e) {
                console.error('Failed to load offline queue', e);
            }
        };
        loadQueue();
        checkConnection();
    }, []);

    // Save queue whenever it changes
    useEffect(() => {
        const saveQueue = async () => {
            try {
                await AsyncStorage.setItem('offlineQueue', JSON.stringify(queue));
            } catch (e) {
                console.error('Failed to save offline queue', e);
            }
        };
        saveQueue();
    }, [queue]);

    const checkConnection = async () => {
        try {
            const state = await Network.getNetworkStateAsync();
            // Consider offline if not connected or not internet reachable (and not null)
            // But sometimes isInternetReachable is null on some simulators, so default to true if connected
            const offline = !(state.isConnected && (state.isInternetReachable ?? true));
            setIsOffline(offline);
            return offline;
        } catch (e) {
            console.error('Failed to check connection', e);
            return false; // Assume online if check fails? Or offline?
        }
    };

    const addToQueue = async (type: 'ADD_TRANSACTION' | 'ADD_BILL', payload: any) => {
        const newItem: QueueItem = {
            id: Date.now().toString(),
            type,
            payload,
            timestamp: Date.now(),
        };
        setQueue(prev => [...prev, newItem]);
    };

    const processQueue = async () => {
        const isStillOffline = await checkConnection();
        if (isStillOffline) return;

        if (queue.length === 0) return;

        // Process sequentially
        const remainingQueue = [...queue];
        const processedIds: string[] = [];

        for (const item of queue) {
            try {
                let url = '';
                let method = 'POST';

                if (item.type === 'ADD_TRANSACTION') {
                    url = `${API_URL}/transactions`;
                } else if (item.type === 'ADD_BILL') {
                    url = `${API_URL}/bills`;
                }

                if (url) {
                    const response = await fetch(url, {
                        method,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(item.payload),
                    });

                    if (response.ok) {
                        processedIds.push(item.id);
                    } else {
                        console.error(`Failed to sync item ${item.id}:`, response.status);
                        // Decide whether to keep or discard. For now, keep retry logic simple: don't remove if failed.
                        // But if it's a 4xx error (bad request), maybe we should discard?
                        // For simplicity, we only remove on 200/201.
                    }
                }
            } catch (e) {
                console.error(`Error processing offline item ${item.id}`, e);
            }
        }

        if (processedIds.length > 0) {
            setQueue(prev => prev.filter(item => !processedIds.includes(item.id)));
        }
    };

    // Auto-process on focus or interval could be added in layout, 
    // or we can expose checkConnection and let dashboard trigger it.

    return (
        <OfflineContext.Provider value={{ isOffline, queue, addToQueue, processQueue, checkConnection }}>
            {children}
        </OfflineContext.Provider>
    );
};
