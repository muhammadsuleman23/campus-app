import axios from "axios";

const API = axios.create({
  baseURL: "/api", // relative URL: dev mein Vite proxy, production mein CloudFront route karta hai
});

// Attach token to every request
API.interceptors.request.use((req) => {
  const raw = localStorage.getItem("userInfo");
  if (raw) {
    const user = JSON.parse(raw);
    if (user?.token) req.headers.Authorization = `Bearer ${user.token}`;

    // Self-heal: sessions created before the login fix have no _id.
    // Without _id, ownership checks and chat sides break, so force a fresh login.
    if (!user?._id) {
      localStorage.removeItem("userInfo");
      localStorage.removeItem("token");
      if (window.location.pathname !== "/" && window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
  }
  return req;
});

export default API;