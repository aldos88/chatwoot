import axios from 'axios';

const BASE = import.meta.env.VITE_HIMATILDA_API_BASE_URL || '';

const http = axios.create({ baseURL: BASE });

export default {
  suggestReply(payload) {
    return http.post('/api/copilot/suggest-reply', payload);
  },
  summarize(payload) {
    return http.post('/api/copilot/summarize', payload);
  },
  rewrite(payload) {
    return http.post('/api/copilot/rewrite', payload);
  },

  // AI Agents — Assistants
  listAssistants() {
    return http.get('/api/ai/assistants');
  },

  // AI Agents — Documents
  listDocuments(assistantId) {
    const params = assistantId ? { assistantId } : {};
    return http.get('/api/ai/documents', { params });
  },
  createDocument(payload) {
    return http.post('/api/ai/documents', payload);
  },
  deleteDocument(id) {
    return http.delete(`/api/ai/documents/${id}`);
  },
};
