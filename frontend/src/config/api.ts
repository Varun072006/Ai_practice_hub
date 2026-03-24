const API_BASE_URL =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    '/aiportal/aipracticehub/api';

export default API_BASE_URL;