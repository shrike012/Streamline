import axios from './axios'; // uses custom axios instance (not the axios library directly)

export const signup = (data) => axios.post('/auth/signup', data);
export const login = (data) => axios.post('/auth/login', data);
export const getMe = () => axios.get('/auth/me');
export const logout = () => axios.post('/auth/logout');