import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// VIN Services
export const vinService = {
  // Get all records
  getRecords: async (filters = {}) => {
    try {
      const response = await api.get('/vins/records', { params: filters });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Add new VIN
  addVin: async (vin, type) => {
    try {
      const response = await api.post('/vins/add', { vin, type });
      return response.data;
    } catch (error) {
      // Handle 409 conflict for duplicates
      if (error.response?.status === 409) {
        return error.response.data;
      }
      throw error.response?.data || error;
    }
  },

  // Add repeated VIN
  addRepeatedVin: async (vin, type) => {
    try {
      const response = await api.post('/vins/add-repeated', { vin, type });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Update VIN
  updateVin: async (id, type, vin) => {
    try {
      const response = await api.post('/vins/update', { id, type, vin });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Delete VIN
  deleteVin: async (id, type) => {
    try {
      const response = await api.post('/vins/delete', { id, type });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Toggle registered status
  toggleRegistered: async (id, type) => {
    try {
      const response = await api.post('/vins/toggle-registered', { id, type });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Register all
  registerAll: async (type) => {
    try {
      const response = await api.post('/vins/register-all', { type });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Unregister all
  unregisterAll: async (type) => {
    try {
      const response = await api.post('/vins/unregister-all', { type });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Export data
  exportData: async (type, date = null) => {
    try {
      const params = { type };
      if (date) params.date = date;

      const response = await api.get('/vins/export', {
        params,
        responseType: 'blob',
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `vins_sin_registrar_${new Date().toISOString().slice(0, 10)}.txt`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      return { success: true, message: 'Archivo descargado correctamente' };
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Check database connection
  checkConnection: async () => {
    try {
      const response = await api.get('/health');
      return {
        isConnected: response.data.database === 'connected',
        status: response.data.status,
        message: response.data.message
      };
    } catch (error) {
      return {
        isConnected: false,
        status: 'ERROR',
        message: error.response?.data?.message || 'No se puede conectar con el servidor'
      };
    }
  },
};

export default api;
