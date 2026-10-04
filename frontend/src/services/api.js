import axios from "axios";
import { getToken, logout } from "./auth";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

// Attach JWT token to API requests
api.interceptors.request.use(
    (config) => {
        const token = getToken();

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Handle expired/invalid authentication
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const requestUrl = error.config?.url || "";

        // Don't automatically logout from the login request itself.
        if (
            status === 401 &&
            !requestUrl.includes("/auth/login")
        ) {
            logout();

            if (window.location.pathname !== "/login") {
                window.location.href = "/login";
            }
        }

        return Promise.reject(error);
    }
);

export default api;