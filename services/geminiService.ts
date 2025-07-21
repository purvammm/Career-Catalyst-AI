
import { GoogleGenAI, Type, GenerateContentResponse, Chat } from "@google/genai";
import { Company, GroundingSource, Contact, ContactStreamResult } from "../types";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export async function* streamCompaniesInLocation(location: string): AsyncGenerator<{ company?: Company; sources?: GroundingSource[] }> {
    const model = 'gemini-2.5-flash';

    const chat: Chat = ai.chats.create({
        model: model,
        config: {
            tools: [{ googleSearch: {} }],
            systemInstruction: `You are an expert local market researcher. Your task is to find technology companies. For each company, provide its name, a concise one-sentence description, and its official website URL.
        
You will stream one company at a time. For EACH company, wrap the JSON object with "---JSON_START---" and "---JSON_END---". Do not use markdown. For example:
---JSON_START---
{"companyName": "Example Tech Inc.", "description": "A leading provider of cloud solutions.", "website": "https://exampletech.com"}
---JSON_END---

When asked to find more, continue your search from where you left off, providing only new companies you haven't listed before. Do not repeat companies.`,
        },
    });

    let turn = 0;
    const uniqueSources = new Map<string, GroundingSource>();

    // This loop now runs indefinitely until the user stops it from the UI.
    while (true) {
        const prompt = turn === 0
            ? `Start by finding all relevant technology companies in ${location}. Include a diverse range: established software firms, IT services, tech startups, and digital agencies.`
            : `Continue your deep-dive analysis of ${location}. Find more technology companies. Do not repeat any companies you have already sent.`;
        
        turn++;

        try {
            const responseStream = await chat.sendMessageStream({ message: prompt });
            
            let buffer = '';
            const startDelimiter = '---JSON_START---';
            const endDelimiter = '---JSON_END---';
            let lastChunk: GenerateContentResponse | null = null;

            for await (const chunk of responseStream) {
                lastChunk = chunk;
                
                const groundingMetadata = chunk.candidates?.[0]?.groundingMetadata;
                if (groundingMetadata?.groundingChunks) {
                     groundingMetadata.groundingChunks.forEach((s: any) => {
                        if(s.web && s.web.uri && s.web.title) {
                            const source = { uri: s.web.uri, title: s.web.title };
                            if (!uniqueSources.has(source.uri)) {
                                uniqueSources.set(source.uri, source);
                            }
                        }
                    });
                }
                
                buffer += chunk.text;

                let startIndex = buffer.indexOf(startDelimiter);
                while (startIndex !== -1) {
                    const endIndex = buffer.indexOf(endDelimiter, startIndex);
                    if (endIndex === -1) break;
                    
                    const jsonString = buffer.substring(startIndex + startDelimiter.length, endIndex).trim();
                    buffer = buffer.substring(endIndex + endDelimiter.length);
                    
                    try {
                        const company = JSON.parse(jsonString);
                        if (company.companyName && company.description && company.website) {
                            yield { company };
                        }
                    } catch (e) {
                        console.warn("Failed to parse JSON object from stream:", jsonString, e);
                    }
                    startIndex = buffer.indexOf(startDelimiter);
                }
            }
            
            const finishReason = lastChunk?.candidates?.[0]?.finishReason;
            if (finishReason && !['STOP', 'MAX_TOKENS'].includes(finishReason)) {
                console.error(`Stream stopped by API. Reason: ${finishReason}.`);
                const safetyRatings = JSON.stringify(lastChunk?.candidates?.[0]?.safetyRatings ?? [], null, 2);
                throw new Error(`The search was stopped by the API for reason: ${finishReason}. Safety Ratings: ${safetyRatings}`);
            }

        } catch (error) {
            console.error("Error fetching companies from Gemini API:", error);
            if (error instanceof Error) throw error;
            throw new Error("An unknown error occurred while fetching company data.");
        }
    
        // After each turn, yield all collected sources so the UI can update live.
        const sources = Array.from(uniqueSources.values());
        if (sources.length > 0) {
            yield { sources };
        }

        // Add a small delay between turns to prevent spamming the API.
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}


export async function* draftTailoredResume(userInfo: string, company: Company): AsyncGenerator<string> {
    const model = 'gemini-2.5-flash';
    const systemInstruction = "You are an expert career coach and resume writer. Your task is to redraft a user's resume to be highly tailored for a specific company. Output in Markdown format.";
    const prompt = `
        Here is the user's current resume/skills summary:
        ---
        ${userInfo}
        ---

        Here is the target company information:
        - Company Name: ${company.companyName}
        - Company Description: ${company.description}
        - Company Website: ${company.website}

        Please draft a compelling, one-page resume in Markdown format. Highlight the user's most relevant skills and experiences that align with the company's focus. Ensure the tone is professional and confident. Start with a powerful summary, followed by key skills, experience, and education sections.
    `;
    
    try {
        const responseStream = await ai.models.generateContentStream({
            model: model,
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
            }
        });

        for await (const chunk of responseStream) {
            yield chunk.text;
        }
    } catch (error) {
        console.error("Error drafting resume with Gemini API:", error);
        yield "An error occurred while drafting the resume. Please try again.";
    }
}

export async function* streamCompanyContacts(company: Company): AsyncGenerator<ContactStreamResult> {
    const model = 'gemini-2.5-flash';
    const systemInstruction = `You are an expert lead generation specialist, mimicking the functionality of tools like Kaspr or Signal Hire. Your task is to find publicly available contact information for key personnel at a specific company. You must prioritize accuracy and clearly distinguish between verified and inferred information.`;
    const prompt = `
        Perform a deep-dive investigation for hiring-related contacts at the following company:
        - Company Name: ${company.companyName}
        - Website: ${company.website}

        I need two types of information:
        1.  **Verified Contacts:** Publicly listed email addresses (e.g., on their careers page) and verified LinkedIn profiles.
        2.  **Inferred Contacts:** If a direct email isn't public, use your knowledge of common corporate email patterns (like f.last@domain, first.last@domain) to infer likely email addresses for high-value contacts.

        Target Roles:
        - Generic: HR Department, Careers, Jobs
        - Specific: Recruiter, Talent Acquisition, HR Manager, Hiring Manager, CTO, VP of Engineering, Head of Technology.

        For each contact found, stream a single JSON object wrapped with "---JSON_START---" and "---JSON_END---".
        Each JSON object must have these properties:
        - "name": The person's name, or a generic name like "HR Department".
        - "role": The person's job title or a description like "General Careers Mailbox".
        - "type": Must be either "email" or "linkedin".
        - "value": The actual email address or the full LinkedIn profile URL.
        - "verification": Must be either "verified" (found directly) or "inferred" (constructed based on a pattern).
        - "notes": For inferred emails, briefly explain the pattern used (e.g., "Inferred using first.last@... pattern."). For verified, you can leave this empty or mention the source.

        Example of an inferred contact:
        ---JSON_START---
        {"name": "John Doe", "role": "CTO", "type": "email", "value": "john.doe@${new URL(company.website).hostname}", "verification": "inferred", "notes": "Inferred from common 'first.last' email pattern."}
        ---JSON_END---

        Example of a verified contact:
        ---JSON_START---
        {"name": "Careers", "role": "General Careers Mailbox", "type": "email", "value": "careers@${new URL(company.website).hostname}", "verification": "verified", "notes": "Found on company careers page."}
        ---JSON_END---

        Begin your deep-dive search now. Do not provide any conversational text outside of the delimited JSON objects.
    `;
    const uniqueSources = new Map<string, GroundingSource>();

    try {
        const responseStream = await ai.models.generateContentStream({
            model: model,
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                tools: [{ googleSearch: {} }],
            },
        });

        let buffer = '';
        const startDelimiter = '---JSON_START---';
        const endDelimiter = '---JSON_END---';
        let lastChunk: GenerateContentResponse | null = null;

        for await (const chunk of responseStream) {
            lastChunk = chunk;
            
            const groundingMetadata = chunk.candidates?.[0]?.groundingMetadata;
            if (groundingMetadata?.groundingChunks) {
                groundingMetadata.groundingChunks.forEach((s: any) => {
                    if (s.web && s.web.uri && s.web.title) {
                        const source = { uri: s.web.uri, title: s.web.title };
                        if (!uniqueSources.has(source.uri)) {
                            uniqueSources.set(source.uri, source);
                        }
                    }
                });
            }
            
            buffer += chunk.text;

            let startIndex = buffer.indexOf(startDelimiter);
            while (startIndex !== -1) {
                const endIndex = buffer.indexOf(endDelimiter, startIndex);
                if (endIndex === -1) break;
                
                const jsonString = buffer.substring(startIndex + startDelimiter.length, endIndex).trim();
                buffer = buffer.substring(endIndex + endDelimiter.length);
                
                try {
                    const contact = JSON.parse(jsonString) as Contact;
                    if (contact.name && contact.role && contact.type && contact.value && contact.verification) {
                        yield { contact };
                    }
                } catch (e) {
                    console.warn("Failed to parse contact JSON object from stream:", jsonString, e);
                }
                startIndex = buffer.indexOf(startDelimiter);
            }
        }
        
        const finishReason = lastChunk?.candidates?.[0]?.finishReason;
        if (finishReason && !['STOP', 'MAX_TOKENS'].includes(finishReason)) {
            console.error(`Contact stream stopped by API. Reason: ${finishReason}.`);
            const safetyRatings = JSON.stringify(lastChunk?.candidates?.[0]?.safetyRatings ?? [], null, 2);
            throw new Error(`The contact search was stopped by the API for reason: ${finishReason}. Safety Ratings: ${safetyRatings}`);
        }

    } catch (error) {
        console.error("Error fetching contacts from Gemini API:", error);
        if (error instanceof Error) throw error;
        throw new Error("An unknown error occurred while fetching contact data.");
    } finally {
        const sources = Array.from(uniqueSources.values());
        if (sources.length > 0) {
            yield { sources };
        }
    }
}