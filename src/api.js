export const API = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
export const mediaUrl = (value) =>
  value?.startsWith("/api/media/") ? API + value : value;
export async function api(path, { method = "GET", body, token } = {}) {
  const response = await fetch(API + "/api" + path, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("Cannot reach the API. Check the server connection.");
  }
  if (!response.ok) {
    const error = new Error(data.error || "Request failed");
    error.status = response.status;
    throw error;
  }
  return data;
}
