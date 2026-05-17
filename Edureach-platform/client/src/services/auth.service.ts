import API from "./api";

export const registerUser = async (data: {
  name: string; email: string; password: string; phone?: string;
}) => {
  const res = await API.post("/auth/register", data);
  return res.data.data; // { token, user }
};

export const loginUser = async (data: { email: string; password: string }) => {
  const res = await API.post("/auth/login", data);
  return res.data.data; // { token, user }
};

export const getMe = async () => {
  const res = await API.get("/auth/me");
  return res.data.data; // { user }
};

export const googleLogin = async (data: {
  credential?: string;
  phone?: string;
  isMock?: boolean;
  mockData?: { email: string; name: string };
}) => {
  const res = await API.post("/auth/google", data);
  return res.data; // Return full response to inspect success, requiresPhone, and data
};