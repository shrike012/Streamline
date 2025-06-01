import axios from './axios';

export const signup = (data) => axios.post('/auth/signup', data);
export const login = (data) => axios.post('/auth/login', data);
export const getMe = () => axios.get('/auth/me');
export const googleLogin = (credential) => axios.post('/auth/google', { credential });