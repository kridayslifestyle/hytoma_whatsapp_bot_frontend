let csrfToken = null;

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(
  /\/$/,
  "",
);

export async function apiRequest(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();

  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(options.body && !isFormData
      ? { "Content-Type": "application/json" }
      : {}),
    ...options.headers,
  };

  if (!["GET", "HEAD", "OPTIONS"].includes(method) && csrfToken) {
    headers["X-CSRF-Token"] = csrfToken;
  }

  const response = await fetch(`/api${path}`, {
    ...options,
    method,
    headers,
    credentials: "same-origin",
  });

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
        : `Request failed (${response.status})`,
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

/**
 * HYTOMA Marketing
 * Retrieve approved WhatsApp marketing templates.
 */
export async function getMarketingTemplates() {
  return apiRequest("/admin/marketing/templates");
}

export async function createMarketingTemplate(payload) {
  return apiRequest("/admin/marketing/templates", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function uploadMarketingMedia(file) {
  if (!(file instanceof File)) {
    throw new Error("Please select a valid file.");
  }

  const allowedTypes = ["image/jpeg", "image/png", "video/mp4"];

  if (!allowedTypes.includes(file.type)) {
    throw new Error("Only JPG, PNG and MP4 files are supported.");
  }

  const maxSize =
    file.type === "video/mp4" ? 16 * 1024 * 1024 : 5 * 1024 * 1024;

  if (file.size === 0 || file.size > maxSize) {
    throw new Error("File is empty or exceeds the allowed size.");
  }

  // Reuse the existing API helper.
  // Do not manually set Content-Type for FormData.
  const formData = new FormData();
  formData.append("file", file);

  return apiRequest("/admin/marketing/media/upload", {
    method: "POST",
    body: formData,
  });
}
