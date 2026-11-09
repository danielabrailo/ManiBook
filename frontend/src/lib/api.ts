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
}

export async function getPowders(accessToken: string): Promise<Powder[]> {
  if (!API_BASE_URL) {
    throw new Error("API URL is not configured.");
  }

  const response = await fetch(`${API_BASE_URL}/powders/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (response.status === 401) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  if (!response.ok) {
    throw new Error(`Failed to load powders (${response.status}).`);
  }

  const data = await response.json();

  // DRF returns an array by default unless pagination is configured.
  return Array.isArray(data) ? data : data.results;
}

export async function createPowder(
  accessToken: string,
  powderData: Omit<Powder, "id" | "created_at" | "updated_at">
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
  photoType: "product" | "swatch" | "inspiration" = "product"
) {
  const formData = new FormData();

  formData.append("powder", String(powderId));
  formData.append("image", image);
  formData.append("photo_type", photoType);
  formData.append("caption", "");
  formData.append("is_primary", "true");

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
