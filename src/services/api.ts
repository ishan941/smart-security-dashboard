/**
 * API Service — Centralized HTTP client for the React dashboard.
 * 
 * WHY axios: Industry standard, interceptors for auth headers,
 * better error handling than fetch API.
 * 
 * WHY /api prefix: Vite dev proxy rewrites /api/* to the backend.
 * In production, configure nginx or similar to proxy these routes.
 */
import axios from 'axios';

// In development, Vite proxy handles /api → http://localhost:3000
// In production, set VITE_API_URL to your backend URL
const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
    baseURL: API_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Automatically attach JWT token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle auth errors globally
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;

// ============================================================
// API Functions
// ============================================================

export interface LoginResponse {
    accessToken: string;
    user: {
        id: string;
        email: string;
        name: string;
        role: string;
    };
}

export interface Event {
    id: string;
    deviceId: string;
    cardId: string;
    eventType: 'ACCESS_GRANTED' | 'ACCESS_DENIED' | 'SENSOR_ALERT';
    timestamp: string;
    createdAt: string;
}

export interface Device {
    id: string;
    deviceId: string;
    name: string;
    location?: string;
    status: 'online' | 'offline' | 'maintenance';
    lastSeenAt?: string;
    createdAt: string;
}

export interface EventStats {
    totalEvents: number;
    accessGranted: number;
    accessDenied: number;
    sensorAlerts: number;
    todayEvents: number;
}

export const authApi = {
    login: (email: string, password: string) =>
        api.post<LoginResponse>('/auth/login', { email, password }),
    register: (email: string, password: string, name?: string) =>
        api.post<LoginResponse>('/auth/register', { email, password, name }),
};

export const eventsApi = {
    getAll: (params?: {
        deviceId?: string;
        eventType?: string;
        startDate?: string;
        endDate?: string;
        limit?: number;
        offset?: number;
    }) => api.get<{ events: Event[]; total: number }>('/events', { params }),
    getStats: () => api.get<EventStats>('/events/stats'),
};

export const devicesApi = {
    getAll: () => api.get<Device[]>('/devices'),
    register: (deviceId: string, name: string, location?: string) =>
        api.post<Device>('/devices/register', { deviceId, name, location }),
};
