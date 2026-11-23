
let csrfToken = null;

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || ""
).replace(/\/$/, "");

export async function apiRequest(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();

  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...options.headers,
  };

  if (
    !["GET", "HEAD", "OPTIONS"].includes(method) &&
    csrfToken
  ) {
    headers["X-CSRF-Token"] = csrfToken;
  }

  const response = await fetch(
    `/api${path}`,
    {
      ...options,
      method,
      headers,
      credentials: "same-origin",
    }
  );

  let data;
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : `Request failed (${response.status})`
    );
  }

  return data;
}

export async function login(username, password) {
  const data = await apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

  csrfToken = data.csrf_token;
  return data;
}

export async function restoreSession() {
  const data = await apiRequest("/auth/me");
  csrfToken = data.csrf_token;
  return data;
}

export async function logout() {
  try {
    await apiRequest("/auth/logout", {
      method: "POST",
    });
  } finally {
    csrfToken = null;
  }
}
