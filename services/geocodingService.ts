export interface GeocodingResult {
  lat: string;
  lon: string;
  boundingbox: string[];
}

export async function getCoordinatesForCity(city: string): Promise<GeocodingResult | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data && data.length > 0) {
      return {
        lat: data[0].lat,
        lon: data[0].lon,
        boundingbox: data[0].boundingbox,
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching geocoding data:", error);
    return null;
  }
}
