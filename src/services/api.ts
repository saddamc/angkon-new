import axios from "axios";


const baseURL = process.env.NEXT_PUBLIC_WC_API_URL;
const consumerKey = process.env.NEXT_PUBLIC_WC_CONSUMER_KEY;
const consumerSecret = process.env.NEXT_PUBLIC_WC_CONSUMER_SECRET;

export const apiClient = axios.create({
  baseURL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
  params:
    consumerKey && consumerSecret
      ? {
          consumer_key: consumerKey,
          consumer_secret: consumerSecret,
        }
      : undefined,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error?.response?.data?.message || error.message || "Request failed";
    return Promise.reject(new Error(message));
  },
);
