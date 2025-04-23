import axios from 'axios';

const API_URL = 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000, // 10 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
});

// Add response interceptor to handle errors
api.interceptors.response.use(
  response => response,
  error => {
    if (error.code === 'ECONNABORTED') {
      error.message = 'Request timeout. Please try again.';
    }
    return Promise.reject(error);
  }
);

export const checkPlagiarism = async (title, content, authorAddress) => {
    try {
      console.log('Sending plagiarism check request:', { 
        title: title.substring(0, 50) + (title.length > 50 ? '...' : ''), 
        content_length: content.length,
        authorAddress 
      });
  
      const response = await api.post('/check_plagiarism', {
        title,
        content,
        authorAddress
      }, {
        timeout: 15000, // 15 second timeout
        headers: {
          'Content-Type': 'application/json'
        }
      });
  
      console.log('Plagiarism check response:', response.data);
      return response.data;
  
    } catch (error) {
      console.error('Full error details:', {
        message: error.message,
        code: error.code,
        config: error.config,
        response: error.response?.data
      });
  
      if (error.response) {
        // Server responded with error status (4xx/5xx)
        throw new Error(`Plagiarism service error: ${error.response.data.error || 'Unknown error'}`);
      } else if (error.request) {
        // Request was made but no response received
        throw new Error('Plagiarism service unavailable. Please try again later.');
      } else {
        // Something else happened
        throw new Error('Failed to check plagiarism: ' + error.message);
      }
    }
  };


export const storePaper = async (bucketHash, title, content, authorAddress, timestamp) => {
  try {
    const response = await api.post('/store_paper', {
      bucketHash,
      title,
      content,
      authorAddress,
      timestamp
    });
    return response.data;
  } catch (error) {
    console.error('Error storing paper:', error);
    throw error;
  }
};

export const addPaperVersion = async (bucketHash, content, timestamp) => {
  try {
    const response = await api.post('/add_version', {
      bucketHash,
      content,
      timestamp
    });
    return response.data;
  } catch (error) {
    console.error('Error adding paper version:', error);
    throw error;
  }
};


export const getPaperContent = async (bucketHash) => {
  try {
    const response = await api.get(`/get_paper_content/${bucketHash}`);
    return response.data;
  } catch (error) {
    console.error('Error getting paper content:', error);
    throw error;
  }
};

export const listPapers = async () => {
  try {
    const response = await api.get('/list_papers');
    return response.data;
  } catch (error) {
    console.error('Error listing papers:', error);
    throw error;
  }
};