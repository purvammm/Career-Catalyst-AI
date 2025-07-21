import { Company, GroundingSource, Contact, ContactStreamResult } from "../types";
import { getCompaniesInBoundingBox } from "./overpassService";

const mockContacts: Contact[] = [
    { name: "Jane Doe", role: "HR Manager", type: "email", value: "jane.doe@innovate.com", verification: "verified", notes: "Found on company website" },
    { name: "John Smith", role: "Recruiter", type: "linkedin", value: "https://linkedin.com/in/johnsmith", verification: "verified", notes: "" },
    { name: "Peter Jones", role: "CTO", type: "email", value: "peter.jones@techsolutions.com", verification: "inferred", notes: "Inferred from common 'first.last' email pattern." },
];

export async function* streamCompaniesInLocation(boundingBox: string): AsyncGenerator<{ company?: Company; sources?: GroundingSource[] }> {
  const companies = await getCompaniesInBoundingBox(boundingBox);

  for (const company of companies) {
    yield { company };
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const sources: GroundingSource[] = [
    { uri: "https://www.openstreetmap.org/", title: "OpenStreetMap" },
    { uri: "https://overpass-api.de/", title: "Overpass API" },
  ];
  yield { sources };
}

export async function* draftTailoredResume(userInfo: string, company: Company): AsyncGenerator<string> {
  const resume = `
# ${userInfo.split('\\n')[0] || 'Your Name'}

## Summary
A highly motivated and experienced professional seeking a challenging role at ${company.companyName}.

## Skills
- JavaScript
- React
- Node.js
- TypeScript

## Experience
**Software Engineer** at a previous company
- Developed and maintained web applications using modern technologies.
- Collaborated with cross-functional teams to deliver high-quality products.

## Education
**Bachelor of Science in Computer Science**
  `;
  for (let i = 0; i < resume.length; i += 10) {
    yield resume.substring(i, i + 10);
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}

export async function* streamCompanyContacts(company: Company): AsyncGenerator<ContactStreamResult> {
    for (const contact of mockContacts) {
        if (contact.value.includes(company.companyName.toLowerCase().split(' ')[0])) {
            yield { contact };
        }
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    const sources: GroundingSource[] = [
        { uri: "https://www.mock-contact-source1.com", title: "Mock Contact Source 1" },
        { uri: "https://www.mock-contact-source2.com", title: "Mock Contact Source 2" },
    ];
    yield { sources };
}
