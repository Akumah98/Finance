import { api } from '@/lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

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
    const wasOffline = useRef(false);

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

    // Auto-sync when coming back online or app returns to foreground
    useEffect(() => {
        const interval = setInterval(async () => {
            const offline = await checkConnection();
            if (wasOffline.current && !offline && queue.length > 0) {
                setTimeout(() => processQueue(), 2000);
            }
            wasOffline.current = offline;
        }, 10000);

        const subscription = AppState.addEventListener('change', async (state) => {
            if (state === 'active') {
                const offline = await checkConnection();
                if (!offline && queue.length > 0) {
                    setTimeout(() => processQueue(), 2000);
                }
            }
        });

        return () => {
            clearInterval(interval);
            subscription.remove();
        };
    }, [queue]);

    const checkConnection = async () => {
        try {
            const state = await Network.getNetworkStateAsync();
            const offline = !(state.isConnected && (state.isInternetReachable ?? true));
            setIsOffline(offline);
            return offline;
        } catch (e) {
            console.error('Failed to check connection', e);
            return false;
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

        const processedIds: string[] = [];

        for (const item of queue) {
            try {
                let endpoint = '';

                if (item.type === 'ADD_TRANSACTION') {
                    endpoint = '/transactions';
                } else if (item.type === 'ADD_BILL') {
                    endpoint = '/bills';
                }

                if (endpoint) {
                    const { error } = await api.post(endpoint, item.payload);
                    if (!error) {
                        processedIds.push(item.id);
                    } else {
                        console.error(`Failed to sync item ${item.id}:`, error);
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

    return (
        <OfflineContext.Provider value={{ isOffline, queue, addToQueue, processQueue, checkConnection }}>
            {children}
        </OfflineContext.Provider>
    );
};
