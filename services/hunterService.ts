import { Contact } from "../types";

const API_KEY = "test-api-key";

export async function getContactsForDomain(domain: string): Promise<Contact[]> {
  const url = `https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data && data.data && data.data.emails) {
      const contacts: Contact[] = data.data.emails.map((email: any) => ({
        name: `${email.first_name} ${email.last_name}`,
        role: email.position || "No position available.",
        type: "email",
        value: email.value,
        verification: email.verification.status,
        notes: "",
      }));
      return contacts;
    } else {
      return [];
    }
  } catch (error) {
    console.error("Error fetching Hunter.io API data:", error);
    return [];
  }
}
