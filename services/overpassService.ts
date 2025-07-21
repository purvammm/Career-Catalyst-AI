import { Company } from "../types";

export async function getCompaniesInBoundingBox(boundingBox: string): Promise<Company[]> {
  const [minLat, minLon, maxLat, maxLon] = boundingBox.split(',');

  const query = `
    [out:json];
    (
      node["office"](${minLat},${minLon},${maxLat},${maxLon});
      way["office"](${minLat},${minLon},${maxLat},${maxLon});
      relation["office"](${minLat},${minLon},${maxLat},${maxLon});
      node["shop"](${minLat},${minLon},${maxLat},${maxLon});
      way["shop"](${minLat},${minLon},${maxLat},${maxLon});
      relation["shop"](${minLat},${minLon},${maxLat},${maxLon});
      node["amenity"](${minLat},${minLon},${maxLat},${maxLon});
      way["amenity"](${minLat},${minLon},${maxLat},${maxLon});
      relation["amenity"](${minLat},${minLon},${maxLat},${maxLon});
    );
    out center;
  `;

  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    const companies: Company[] = data.elements.map((element: any) => ({
      companyName: element.tags.name || "Unknown Company",
      description: element.tags.description || "No description available.",
      website: element.tags.website || element.tags["contact:website"] || "",
    }));

    return companies;
  } catch (error) {
    console.error("Error fetching Overpass API data:", error);
    return [];
  }
}
