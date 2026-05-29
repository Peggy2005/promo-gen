import axios from 'axios';

const api = axios.create({ baseURL: '/api', timeout: 240000 }); // 4 min for AI generation

export const generateCopy = (payload) => api.post('/generate/copy', payload);
export const generateImage = (payload) => api.post('/generate/image', payload);
export const checkGPTStatus = () => api.get('/generate/status');

export const publishToBlogger = (payload) => api.post('/publish/blogger', payload);
export const publishToFacebook = (payload) => api.post('/publish/facebook', payload);
export const publishToDiscord = (payload) => api.post('/publish/discord', payload);
