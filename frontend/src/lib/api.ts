const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

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

export async function getTags(accessToken: string): Promise<Tag[]> {
  const response = await fetch(`${API_BASE_URL}/tags/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

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
  const response = await fetch(`${API_BASE_URL}/tags/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ name: name.trim() }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(JSON.stringify(errorData));
  }

  return response.json();
}

export async function getPowders(
  accessToken: string,
  filters: PowderFilters = {}
): Promise<Powder[]> {
  const params = new URLSearchParams();

  if (filters.search) params.set("search", filters.search);
  if (filters.colour_family) params.set("colour_family", filters.colour_family);
  if (filters.finish) params.set("finish", filters.finish);
  if (filters.intensity) params.set("intensity", filters.intensity);
  if (filters.undertone) params.set("undertone", filters.undertone);

  if (filters.is_favourite) {
    params.set("is_favourite", "true");
  }

  if (filters.ordering) params.set("ordering", filters.ordering);

  filters.tags?.forEach((tagId) => {
    params.append("tags", String(tagId));
  });

  const response = await fetch(
    `${API_BASE_URL}/powders/?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
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
  const response = await fetch(`${API_BASE_URL}/powders/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(powderData),
  });

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

  const response = await fetch(`${API_BASE_URL}/powder-photos/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

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
  const response = await fetch(`${API_BASE_URL}/powder-photos/${photoId}/`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });

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
  const response = await fetch(`${API_BASE_URL}/powders/${id}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Could not load this powder.");
  }

  return response.json();
}

export async function getPowderPhotos(
  accessToken: string,
  powderId: number
): Promise<PowderPhoto[]> {
  const response = await fetch(
    `${API_BASE_URL}/powder-photos/?powder=${powderId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error("Could not load powder photos.");
  }

  const data = await response.json();

  return Array.isArray(data) ? data : data.results;
}

export function getImageUrl(image: string): string {
  if (image.startsWith("http")) {
    return image;
  }

  const backendOrigin = new URL(API_BASE_URL).origin;

  return `${backendOrigin}${image}`;
}

export async function updatePowder(
  accessToken: string,
  id: number,
  powderData: Partial<Powder>
): Promise<Powder> {
  const response = await fetch(`${API_BASE_URL}/powders/${id}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(powderData),
  });

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
  const response = await fetch(`${API_BASE_URL}/powders/${id}/`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Could not delete this powder.");
  }
}

export async function deletePowderPhoto(
  accessToken: string,
  photoId: number
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/powder-photos/${photoId}/`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Could not delete this photo.");
  }
}
