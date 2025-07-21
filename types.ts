
export interface Company {
  companyName: string;
  description: string;
  website: string;
}

export interface GroundingSource {
  uri: string;
  title: string;
}

export type ResumeGenerationStatus = 'idle' | 'generating' | 'done' | 'error';

export interface ResumeState {
    status: ResumeGenerationStatus;
    content: string;
}

export interface Contact {
  name: string;
  role: string;
  type: 'email' | 'linkedin';
  value: string;
  verification: 'verified' | 'inferred';
  notes?: string;
}

export type ContactGenerationStatus = 'idle' | 'generating' | 'done' | 'error';

export interface ContactState {
    status: ContactGenerationStatus;
    contacts: Contact[];
    sources: GroundingSource[];
    error?: string;
}

export interface ContactStreamResult {
  contact?: Contact;
  sources?: GroundingSource[];
}