const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// ============================================================
// Authentication
// ============================================================

// Shared promise prevents multiple simultaneous refresh requests.
let refreshPromise: Promise<string | null> | null = null;

/**
 * Clears the stored credentials and redirects to login.
 */
function expireSession(): void {
  if (typeof window === "undefined") return;

  sessionStorage.removeItem("accessToken");
  sessionStorage.removeItem("refreshToken");

  window.location.assign("/login");
}

/**
 * Requests a new access token using the stored refresh token.
 *
 * Returns:
 * - New access token if successful.
 * - null if the refresh token is missing or invalid.
 *
 * Network errors and server errors are thrown without
 * clearing the existing session.
 */
async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const refreshToken = sessionStorage.getItem("refreshToken");

    if (!refreshToken) {
      expireSession();
      return null;
    }

    let response: Response;

    try {
      response = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refresh: refreshToken,
        }),
      });
    } catch {
      throw new Error(
        "Unable to refresh your session. Please check your connection."
      );
    }

    // A 400 or 401 means the refresh credentials are no longer valid.
    if (response.status === 400 || response.status === 401) {
      expireSession();
      return null;
    }

    // A server error should not automatically log the user out.
    if (!response.ok) {
      throw new Error(
        "The server could not refresh your session. Please try again."
      );
    }

    const data = await response.json();

    if (!data.access) {
      throw new Error("The server returned an invalid refresh response.");
    }

    // Store the new access token.
    sessionStorage.setItem("accessToken", data.access);

    // SimpleJWT normally doesn't rotate refresh tokens by default.
    // If rotation is enabled, save the replacement token too.
    if (data.refresh) {
      sessionStorage.setItem("refreshToken", data.refresh);
    }

    return data.access as string;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

/**
 * Makes an authenticated API request.
 *
 * If the access token has expired:
 * 1. Refreshes it.
 * 2. Retries the original request once.
 * 3. Redirects to login if authentication still fails.
 */
async function authenticatedFetch(
  accessToken: string,
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const getCurrentAccessToken = () => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("accessToken") || accessToken;
    }

    return accessToken;
  };

  const makeRequest = (token: string) => {
    const headers = new Headers(options.headers);

    headers.set("Authorization", `Bearer ${token}`);

    return fetch(url, {
      ...options,
      headers,
    });
  };

  // First request.
  const response = await makeRequest(getCurrentAccessToken());

  if (response.status !== 401) {
    return response;
  }

  // Access token may have expired. Refresh it.
  const newAccessToken = await refreshAccessToken();

  if (!newAccessToken) {
    throw new Error("Your session has expired. Please log in again.");
  }

  // Retry the original request once.
  const retryResponse = await makeRequest(newAccessToken);

  if (retryResponse.status === 401) {
    expireSession();

    throw new Error("Your session has expired. Please log in again.");
  }

  return retryResponse;
}

// ============================================================
// Interfaces
// ============================================================

export interface Powder {
  id: number;
  name: string;
  brand: string;
  product_code: string;
  colour_family: string;
  hex_colour: string;
  finish: string;
  intensity: string;
  undertone: string;
  coverage: string;
  is_favourite: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
  primary_photo: string | null;
  tags: number[];
}

export interface PowderPhoto {
  id: number;
  powder: number;
  image: string;
  photo_type: "product" | "swatch" | "inspiration";
  caption: string;
  is_primary: boolean;
  created_at: string;
}

export interface Tag {
  id: number;
  name: string;
  created_at: string;
}

export interface PowderFilters {
  search?: string;
  colour_family?: string;
  finish?: string;
  intensity?: string;
  undertone?: string;
  is_favourite?: boolean;
  ordering?: string;
  tags?: number[];
}

export interface Manicure {
  id: number;
  title: string;
  completed_at: string;
  nail_shape:
    | "almond"
    | "oval"
    | "square"
    | "coffin"
    | "stiletto"
    | "round"
    | "other";
  technique: "solid" | "french" | "ombre" | "nail_art" | "mixed" | "other";
  nail_length: "extra_short" | "short" | "medium" | "long" | "extra_long";
  rating: number | null;
  notes: string;
  wear_duration_days: number;
  removal_date: string | null;
  powders: number[];
  tags: number[];
  primary_photo: string | null;
}

export interface ManicurePhoto {
  id: number;
  manicure: number;
  image: string;
  caption: string;
  is_primary: boolean;
  created_at: string;
}

export interface ManicureFilters {
  search?: string;
  nail_shape?: string;
  technique?: string;
  nail_length?: string;
  rating?: number;
  ordering?: string;
  tags?: number[];
}

export type ManicureInput = Omit<
  Manicure,
  "id" | "wear_duration_days" | "primary_photo"
>;

// ============================================================
// Tags
// ============================================================

export async function getTags(accessToken: string): Promise<Tag[]> {
  const response = await authenticatedFetch(
    accessToken,
    `${API_BASE_URL}/tags/`,
    {
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error("Could not load tags.");
  }

  const data = await response.json();

  return Array.isArray(data) ? data : data.results;
}

export async function createTag(
  accessToken: string,
  name: string
): Promise<Tag> {
  const response = await authenticatedFetch(
    accessToken,
    `${API_BASE_URL}/tags/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: name.trim() }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(JSON.stringify(errorData));
  }

  return response.json();
}

// ============================================================
// Powders
// ============================================================

export async function getPowders(
  accessToken: string,
  filters: PowderFilters = {}
): Promise<Powder[]> {
  const params = new URLSearchParams();

  if (filters.search) params.set("search", filters.search);
  if (filters.colour_family) {
    params.set("colour_family", filters.colour_family);
  }
  if (filters.finish) params.set("finish", filters.finish);
  if (filters.intensity) params.set("intensity", filters.intensity);
  if (filters.undertone) params.set("undertone", filters.undertone);

  if (filters.is_favourite) {
    params.set("is_favourite", "true");
  }

  if (filters.ordering) {
    params.set("ordering", filters.ordering);
  }

  filters.tags?.forEach((tagId) => {
    params.append("tags", String(tagId));
  });

  const response = await authenticatedFetch(
    accessToken,
    `${API_BASE_URL}/powders/?${params.toString()}`,
    {
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error("Could not load powders.");
  }

  const data = await response.json();

  return Array.isArray(data) ? data : data.results;
}

export async function createPowder(
  accessToken: string,
  powderData: Omit<Powder, "id" | "created_at" | "updated_at" | "tags"> & {
    tags?: number[];
  }
): Promise<Powder> {
  const response = await authenticatedFetch(
    accessToken,
    `${API_BASE_URL}/powders/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(powderData),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(JSON.stringify(errorData));
  }

  return response.json();
}

export async function uploadPowderPhoto(
  accessToken: string,
  powderId: number,
  image: File,
  photoType: "product" | "swatch" | "inspiration" = "product",
  isPrimary: boolean = false,
  caption: string = ""
): Promise<PowderPhoto> {
  const formData = new FormData();

  formData.append("powder", String(powderId));
  formData.append("image", image);
  formData.append("photo_type", photoType);
  formData.append("caption", caption);
  formData.append("is_primary", String(isPrimary));

  const response = await authenticatedFetch(
    accessToken,
    `${API_BASE_URL}/powder-photos/`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(JSON.stringify(errorData));
  }

  return response.json();
}

export async function updatePowderPhoto(
  accessToken: string,
  photoId: number,
  updates: Partial<Pick<PowderPhoto, "caption" | "is_primary">>
): Promise<PowderPhoto> {
  const response = await authenticatedFetch(
    accessToken,
    `${API_BASE_URL}/powder-photos/${photoId}/`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(JSON.stringify(errorData));
  }

  return response.json();
}

export async function getPowder(
  accessToken: string,
  id: number
): Promise<Powder> {
  const response = await authenticatedFetch(
    accessToken,
    `${API_BASE_URL}/powders/${id}/`,
    {
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error("Could not load this powder.");
  }

  return response.json();
}

export async function getPowderPhotos(
  accessToken: string,
  powderId: number
): Promise<PowderPhoto[]> {
  const response = await authenticatedFetch(
    accessToken,
    `${API_BASE_URL}/powder-photos/?powder=${powderId}`,
    {
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error("Could not load powder photos.");
  }

  const data = await response.json();

  return Array.isArray(data) ? data : data.results;
}

// ============================================================
// Images
// ============================================================

export function getImageUrl(image: string): string {
  if (image.startsWith("http")) {
    return image;
  }

  const backendOrigin = new URL(API_BASE_URL!).origin;

  return `${backendOrigin}${image}`;
}

// ============================================================
// Update and delete
// ============================================================

export async function updatePowder(
  accessToken: string,
  id: number,
  powderData: Partial<Powder>
): Promise<Powder> {
  const response = await authenticatedFetch(
    accessToken,
    `${API_BASE_URL}/powders/${id}/`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(powderData),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(JSON.stringify(errorData));
  }

  return response.json();
}

export async function deletePowder(
  accessToken: string,
  id: number
): Promise<void> {
  const response = await authenticatedFetch(
    accessToken,
    `${API_BASE_URL}/powders/${id}/`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    throw new Error("Could not delete this powder.");
  }
}

export async function deletePowderPhoto(
  accessToken: string,
  photoId: number
): Promise<void> {
  const response = await authenticatedFetch(
    accessToken,
    `${API_BASE_URL}/powder-photos/${photoId}/`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    throw new Error("Could not delete this photo.");
  }
}

// ============================================================
// Manicures
// ============================================================

export async function getManicures(
  accessToken: string,
  filters: ManicureFilters = {}
): Promise<Manicure[]> {
  const params = new URLSearchParams();

  if (filters.search) params.set("search", filters.search);
  if (filters.nail_shape) params.set("nail_shape", filters.nail_shape);
  if (filters.technique) params.set("technique", filters.technique);
  if (filters.nail_length) params.set("nail_length", filters.nail_length);

  if (filters.rating !== undefined) {
    params.set("rating", String(filters.rating));
  }

  if (filters.ordering) {
    params.set("ordering", filters.ordering);
  }

  if (filters.tags && filters.tags.length > 0) {
    params.set("tags", filters.tags.join(","));
  }

  const response = await authenticatedFetch(
    accessToken,
    `${API_BASE_URL}/manicures/?${params.toString()}`,
    {
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error("Could not load manicures.");
  }

  const data = await response.json();

  return Array.isArray(data) ? data : data.results;
}

export async function getManicure(
  accessToken: string,
  id: number
): Promise<Manicure> {
  const response = await authenticatedFetch(
    accessToken,
    `${API_BASE_URL}/manicures/${id}/`,
    {
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error("Could not load this manicure.");
  }

  return response.json();
}

export async function createManicure(
  accessToken: string,
  manicureData: ManicureInput
): Promise<Manicure> {
  const response = await authenticatedFetch(
    accessToken,
    `${API_BASE_URL}/manicures/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(manicureData),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(JSON.stringify(errorData));
  }

  return response.json();
}

export async function updateManicure(
  accessToken: string,
  id: number,
  manicureData: Partial<ManicureInput>
): Promise<Manicure> {
  const response = await authenticatedFetch(
    accessToken,
    `${API_BASE_URL}/manicures/${id}/`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(manicureData),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(JSON.stringify(errorData));
  }

  return response.json();
}

export async function deleteManicure(
  accessToken: string,
  id: number
): Promise<void> {
  const response = await authenticatedFetch(
    accessToken,
    `${API_BASE_URL}/manicures/${id}/`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    throw new Error("Could not delete this manicure.");
  }
}

// ============================================================
// Manicure Photos
// ============================================================

export async function getManicurePhotos(
  accessToken: string,
  manicureId: number
): Promise<ManicurePhoto[]> {
  const response = await authenticatedFetch(
    accessToken,
    `${API_BASE_URL}/manicure-photos/?manicure=${manicureId}`,
    {
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error("Could not load manicure photos.");
  }

  const data = await response.json();

  return Array.isArray(data) ? data : data.results;
}

export async function uploadManicurePhoto(
  accessToken: string,
  manicureId: number,
  image: File,
  isPrimary: boolean = false,
  caption: string = ""
): Promise<ManicurePhoto> {
  const formData = new FormData();

  formData.append("manicure", String(manicureId));
  formData.append("image", image);
  formData.append("caption", caption);
  formData.append("is_primary", String(isPrimary));

  const response = await authenticatedFetch(
    accessToken,
    `${API_BASE_URL}/manicure-photos/`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(JSON.stringify(errorData));
  }

  return response.json();
}

export async function updateManicurePhoto(
  accessToken: string,
  photoId: number,
  updates: Partial<Pick<ManicurePhoto, "caption" | "is_primary">>
): Promise<ManicurePhoto> {
  const response = await authenticatedFetch(
    accessToken,
    `${API_BASE_URL}/manicure-photos/${photoId}/`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(JSON.stringify(errorData));
  }

  return response.json();
}

export async function deleteManicurePhoto(
  accessToken: string,
  photoId: number
): Promise<void> {
  const response = await authenticatedFetch(
    accessToken,
    `${API_BASE_URL}/manicure-photos/${photoId}/`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    throw new Error("Could not delete this manicure photo.");
  }
}
