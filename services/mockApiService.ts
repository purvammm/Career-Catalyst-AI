import { Company, GroundingSource, Contact, ContactStreamResult } from "../types";

const mockCompanies: Company[] = [
  { companyName: "Innovate Inc.", description: "A leading provider of innovative solutions.", website: "https://innovate.com" },
  { companyName: "Tech Solutions Ltd.", description: "Your partner in digital transformation.", website: "https://techsolutions.com" },
  { companyName: "Future Systems", description: "Building the technology of tomorrow.", website: "https://futuresystems.com" },
];

const mockContacts: Contact[] = [
    { name: "Jane Doe", role: "HR Manager", type: "email", value: "jane.doe@innovate.com", verification: "verified", notes: "Found on company website" },
    { name: "John Smith", role: "Recruiter", type: "linkedin", value: "https://linkedin.com/in/johnsmith", verification: "verified", notes: "" },
    { name: "Peter Jones", role: "CTO", type: "email", value: "peter.jones@techsolutions.com", verification: "inferred", notes: "Inferred from common 'first.last' email pattern." },
];

export async function* streamCompaniesInLocation(location: string): AsyncGenerator<{ company?: Company; sources?: GroundingSource[] }> {
  for (const company of mockCompanies) {
    if (location.toLowerCase() === 'san francisco') {
        yield { company };
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  const sources: GroundingSource[] = [
    { uri: "https://www.mock-source1.com", title: "Mock Source 1" },
    { uri: "https://www.mock-source2.com", title: "Mock Source 2" },
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
