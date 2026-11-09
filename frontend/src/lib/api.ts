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
