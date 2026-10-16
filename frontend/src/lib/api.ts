const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export async function getPowders(accessToken: string) {
  if (!API_BASE_URL) {
    throw new Error("API base URL is not configured.");
  }

  const response = await fetch(`${API_BASE_URL}/powders/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to load powders: ${response.status}`);
  }

  return response.json();
}
