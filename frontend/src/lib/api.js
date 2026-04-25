const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api";

export async function planTrip(payload) {
  const response = await fetch(`${API_BASE}/plan-trip/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "Unable to plan this trip.");
  }

  return data;
}
