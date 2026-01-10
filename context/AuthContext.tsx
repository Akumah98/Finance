import { useRouter, useSegments } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useState } from 'react';

// Define the shape of the context
interface AuthContextType {
    user: any | null;
    token: string | null;
    isLoading: boolean;
    login: (token: string, userData: any) => Promise<void>;
    logout: () => Promise<void>;
    register: (token: string, userData: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    token: null,
    isLoading: true,
    login: async () => { },
    logout: async () => { },
    register: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<any | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const segments = useSegments();

    // Check for stored token on startup and sync with backend
    useEffect(() => {
        const loadUser = async () => {
            try {
                // SecureStore for token
                const storedToken = await SecureStore.getItemAsync('userToken');
                const storedUser = await SecureStore.getItemAsync('userData');

                if (storedToken) {
                    // 1. Optimistically set state from storage first (optional, prevents flash)
                    // setToken(storedToken);
                    // if (storedUser) setUser(JSON.parse(storedUser));

                    // 2. Verify with backend
                    try {
                        const { API_URL } = require('@/constants/config'); // Dynamic import to avoid cycles if any
                        const response = await fetch(`${API_URL}/users/me`, {
                            headers: {
                                Authorization: `Bearer ${storedToken}`,
                            },
                        });

                        if (response.ok) {
                            const userData = await response.json();
                            setToken(storedToken);
                            setUser(userData);
                            // Update stored user data with fresh data
                            await SecureStore.setItemAsync('userData', JSON.stringify(userData));
                        } else {
                            if (response.status === 401 || response.status === 404) {
                                // Token invalid or user deleted
                                console.log('Token invalid or user not found, logging out');
                                await logout();
                            } else {
                                // Server error or something else, fall back to storage if available
                                // This allows offline usage if the token was valid before
                                console.log('Server error verifying user, falling back to local storage');
                                if (storedUser) {
                                    setToken(storedToken);
                                    setUser(JSON.parse(storedUser));
                                }
                            }
                        }
                    } catch (networkError) {
                        console.log('Network error syncing user, falling back to local storage', networkError);
                        // Offline fallback
                        if (storedUser) {
                            setToken(storedToken);
                            setUser(JSON.parse(storedUser));
                        }
                    }
                }
            } catch (e) {
                console.log('Failed to load user', e);
            } finally {
                setIsLoading(false);
            }
        };

        loadUser();
    }, []);

    // Protected Route Logic
    useEffect(() => {
        if (isLoading) return;

        const inAuthGroup = segments[0] === '(auth)';

        if (!token && !inAuthGroup) {
            router.replace('/(auth)/login');
        } else if (token && inAuthGroup) {
            router.replace('/(main)/dashboard');
        }
    }, [token, segments, isLoading]);

    const login = async (newToken: string, newData: any) => {
        setToken(newToken);
        setUser(newData);
        await SecureStore.setItemAsync('userToken', newToken);
        await SecureStore.setItemAsync('userData', JSON.stringify(newData));
    };

    const register = async (newToken: string, newData: any) => {
        setToken(newToken);
        setUser(newData);
        await SecureStore.setItemAsync('userToken', newToken);
        await SecureStore.setItemAsync('userData', JSON.stringify(newData));
    };

    const logout = async () => {
        setToken(null);
        setUser(null);
        await SecureStore.deleteItemAsync('userToken');
        await SecureStore.deleteItemAsync('userData');
    };

    return (
        <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
