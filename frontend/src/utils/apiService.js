import axios from "axios";
import baseURL from "./baseURL.js";
import { navigateToLogin } from "./navigate.js";
import toaster from "./toaster.jsx";

const apiClient = axios.create({
    baseURL: baseURL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
    timeout: 20000,
});

apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response) {
            const { status, data } = error.response;

            if (data?.seassonExpired) {
                navigateToLogin();
            }

            switch (status) {
                case 401:
                    console.error("Unauthorized access");
                    break;
                case 403:
                    console.error("Access forbidden");
                    break;
                case 500:
                    console.error("Server error");
                    break;
                default:
                    console.error("Request failed:", data);
            }
        } else if (error.request) {
            console.error("Network error:", error.request);
        } else {
            console.log("Error:", error.message);
        }
        return Promise.reject(error);
    }
);

class ApiService {
    async get(endpoint, config = {}) {
        try {
            const response = await apiClient.get(endpoint, config);
            return response.data;
        } catch (error) {
            throw error;
        }
    }

    async post(endpoint, data = {}, config = {}) {
        try {
            const response = await apiClient.post(endpoint, data, config);
            return response.data;
        } catch (error) {
            throw error;
        }
    }

    async put(endpoint, data = {}, config = {}) {
        try {
            const response = await apiClient.put(endpoint, data, config);
            return response.data;
        } catch (error) {
            throw error;
        }
    }

    async delete(endpoint, config = {}) {
        try {
            const response = await apiClient.delete(endpoint, config);
            return response.data;
        } catch (error) {
            throw error;
        }
    }

    async patch(endpoint, data = {}, config = {}) {
        try {
            const response = await apiClient.patch(endpoint, data, config);
            return response.data;
        } catch (error) {
            throw error;
        }
    }

    async uploadFile(endpoint, file, config = {}) {
        try {
            const formData = new FormData();
            formData.append("csvFile", file);

            const response = await apiClient.post(endpoint, formData, {
                ...config,
                headers: {
                    ...config.headers,
                    "Content-Type": "multipart/form-data",
                },
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    }

    async downloadFile(endpoint, data, reqType = "get", config = {}) {
        try {
            let response;
            if (reqType === "get") {
                response = await apiClient.get(endpoint, {
                    ...config,
                    responseType: "blob",
                });
            } else {
                response = await apiClient.post(endpoint, data, {
                    ...config,
                    responseType: "blob",
                });
            }
            const disposition = response.headers["content-disposition"];
            let filename = "download.csv";

            if (disposition && disposition.includes("filename=")) {
                const match = disposition.match(/filename="?([^"]+)"?/);
                if (match && match[1]) {
                    filename = match[1];
                }
            }

            const blob = new Blob([response.data], {
                type: response.headers["content-type"],
            });
            const url = window.URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            throw error;
        }
    }

    async openPdfForPrint(endpoint, data = {}, config = {}) {
        try {
            const response = await apiClient.post(endpoint, data, {
                ...config,
                responseType: "blob",
                headers: {
                    ...config.headers,
                    "Content-Type": "application/json",
                },
            });

            const disposition = response.headers["content-disposition"];
            let filename = "download.pdf";

            if (disposition && disposition.includes("filename=")) {
                const match = disposition.match(
                    /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
                );
                if (match?.[1]) {
                    filename = match[1].replace(/['"]/g, "");
                }
            }

            const blob = new Blob([response.data], { type: "application/pdf" });
            const blobUrl = URL.createObjectURL(blob);

            const printWindow = window.open(blobUrl, "_blank");

            if (printWindow) {
                printWindow.onload = () => {
                    printWindow.focus();
                    printWindow.print();
                };
            } else {
                throw new Error(
                    "Popup blocked! Please allow popups for this site."
                );
            }

            return filename;
        } catch (error) {
            throw error;
        }
    }
}
const apiService = new ApiService();

export default apiService;

export { ApiService };
