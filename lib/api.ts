import * as SecureStore from 'expo-secure-store';
import { API_URL } from '@/constants/config';
import { localCache } from '@/lib/localCache';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface ApiResponse<T = any> {
    data: T | null;
    error: string | null;
    status: number;
}

let logoutCallback: (() => void) | null = null;

export function setLogoutCallback(fn: () => void) {
    logoutCallback = fn;
}

function invalidateCacheForEndpoint(endpoint: string) {
    const ep = endpoint.toLowerCase();
    if (ep.includes('transaction')) {
        localCache.invalidatePrefix('transactions_');
        localCache.invalidatePrefix('healthscore_');
        localCache.invalidatePrefix('userstats_');
    }
    if (ep.includes('categor')) {
        localCache.invalidatePrefix('categories_');
        localCache.invalidatePrefix('budgets_');
    }
    if (ep.includes('bill')) {
        localCache.invalidatePrefix('bills_');
        localCache.invalidatePrefix('healthscore_');
    }
    if (ep.includes('goal')) {
        localCache.invalidatePrefix('goals_');
        localCache.invalidatePrefix('healthscore_');
        localCache.invalidatePrefix('userstats_');
    }
    if (ep.includes('budget')) {
        localCache.invalidatePrefix('budgets_');
        localCache.invalidatePrefix('healthscore_');
    }
}

async function request<T = any>(
    method: HttpMethod,
    endpoint: string,
    body?: any
): Promise<ApiResponse<T>> {
    try {
        const token = await SecureStore.getItemAsync('userToken');

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config: RequestInit = { method, headers };
        if (body && method !== 'GET') {
            config.body = JSON.stringify(body);
        }

        const response = await fetch(`${API_URL}${endpoint}`, config);

        if (response.status === 401) {
            if (logoutCallback) logoutCallback();
            return { data: null, error: 'Session expired. Please login again.', status: 401 };
        }

        const data = await response.json();

        if (!response.ok) {
            return { data: null, error: data.message || 'Request failed', status: response.status };
        }

        if (method !== 'GET') {
            invalidateCacheForEndpoint(endpoint);
        }

        return { data, error: null, status: response.status };
    } catch (err: any) {
        return { data: null, error: err.message || 'Network error', status: 0 };
    }
}

async function requestText(
    endpoint: string
): Promise<ApiResponse<string>> {
    try {
        const token = await SecureStore.getItemAsync('userToken');

        const headers: Record<string, string> = {};

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_URL}${endpoint}`, { method: 'GET', headers });

        if (response.status === 401) {
            if (logoutCallback) logoutCallback();
            return { data: null, error: 'Session expired. Please login again.', status: 401 };
        }

        const text = await response.text();

        if (!response.ok) {
            return { data: null, error: 'Request failed', status: response.status };
        }

        return { data: text, error: null, status: response.status };
    } catch (err: any) {
        return { data: null, error: err.message || 'Network error', status: 0 };
    }
}

export const api = {
    get: <T = any>(endpoint: string) => request<T>('GET', endpoint),
    getText: (endpoint: string) => requestText(endpoint),
    post: <T = any>(endpoint: string, body?: any) => request<T>('POST', endpoint, body),
    put: <T = any>(endpoint: string, body?: any) => request<T>('PUT', endpoint, body),
    patch: <T = any>(endpoint: string, body?: any) => request<T>('PATCH', endpoint, body),
    delete: <T = any>(endpoint: string, body?: any) => request<T>('DELETE', endpoint, body),
};
