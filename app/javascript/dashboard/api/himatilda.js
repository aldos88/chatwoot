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
};
