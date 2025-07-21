
import React, { useState, useRef, useMemo, useCallback } from 'react';
import { Company, ResumeState, ContactState, Contact, GroundingSource } from '../types';
import * as MockApiService from '../services/mockApiService';
import { 
    ArrowLeftIcon, ClipboardIcon, CheckIcon, SparklesIcon, ArrowPathIcon, UploadIcon, CheckCircleIcon, 
    ExclamationCircleIcon, UsersIcon, AtSymbolIcon, LinkedInIcon 
} from './Icons';
import SourceList from './SourceList';
import ErrorMessage from './ErrorMessage';

interface DraftingViewProps {
  companies: Company[];
  onBack: () => void;
  apiService: typeof MockApiService;
}

const ResumeContent: React.FC<{ company: Company, state: ResumeState, onGenerate: () => void, onCopy: () => void, isCopied: boolean }> = ({ company, state, onGenerate, onCopy, isCopied }) => {
    if (state.status === 'idle') {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <SparklesIcon className="w-12 h-12 text-gray-500" />
                <p className="mt-4 text-lg font-semibold text-white">Ready to Draft</p>
                <p className="text-gray-400 mb-6">A tailored resume for {company.companyName} will appear here.</p>
                <button
                    onClick={onGenerate}
                    className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
                >
                    Generate this Resume
                </button>
            </div>
        )
    }

    if (state.status === 'generating' && !state.content) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <ArrowPathIcon className="w-12 h-12 text-cyan-400 animate-spin" />
                <p className="mt-4 text-lg font-semibold text-white">Drafting for {company.companyName}...</p>
                <p className="text-gray-400">The AI is tailoring your information, please wait.</p>
            </div>
        );
    }
    
    return (
        <div className="relative h-full flex flex-col">
            <div className="flex-grow overflow-y-auto p-6 prose prose-invert prose-sm md:prose-base prose-pre:bg-transparent prose-pre:p-0 prose-pre:text-gray-200">
                 <pre className="whitespace-pre-wrap font-mono leading-relaxed">{state.content}{state.status === 'generating' && <span className="inline-block w-2 h-4 bg-cyan-400 animate-pulse ml-1" />}</pre>
            </div>
            <div className="flex-shrink-0 p-4 bg-gray-900/50 border-t border-gray-700 flex justify-end">
                 <button
                    onClick={onCopy}
                    disabled={!state.content || state.status === 'generating'}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                >
                    {isCopied ? <CheckIcon className="w-5 h-5" /> : <ClipboardIcon className="w-5 h-5" />}
                    {isCopied ? 'Copied!' : 'Copy Markdown'}
                </button>
            </div>
        </div>
    )
}

const ContactCard: React.FC<{ contact: Contact; onCopy: (value: string) => void; isCopied: boolean }> = ({ contact, onCopy, isCopied }) => {
    const isVerified = contact.verification === 'verified';
    return (
        <div className="bg-gray-800 p-4 rounded-lg flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                {contact.type === 'email' 
                    ? <AtSymbolIcon className="w-5 h-5 text-cyan-400" />
                    : <LinkedInIcon className="w-5 h-5 text-cyan-400" />
                }
            </div>
            <div className="flex-grow overflow-hidden">
                <div className="flex items-center gap-2">
                    <p className="font-semibold text-white truncate">{contact.name}</p>
                    {contact.type === 'email' && (
                         <span title={isVerified ? 'This email was found on a public source.' : contact.notes || 'This email was intelligently inferred.'} className={`text-xs font-medium px-2 py-0.5 rounded-full ${isVerified ? 'bg-green-900/50 text-green-300' : 'bg-yellow-900/50 text-yellow-300'}`}>
                            {isVerified ? 'Verified' : 'Inferred'}
                        </span>
                    )}
                </div>
                <p className="text-sm text-gray-400">{contact.role}</p>
                {contact.type === 'email' ? (
                    <div className="flex items-center gap-2 mt-2">
                        <p className="text-sm text-cyan-300 truncate" title={contact.value}>{contact.value}</p>
                        <button onClick={() => onCopy(contact.value)} className="flex-shrink-0 text-gray-400 hover:text-white">
                            {isCopied ? <CheckIcon className="w-4 h-4 text-green-400" /> : <ClipboardIcon className="w-4 h-4" />}
                        </button>
                    </div>
                ) : (
                    <a href={contact.value} target="_blank" rel="noopener noreferrer" className="text-sm text-cyan-300 hover:underline mt-2 inline-block">
                        View Profile &rarr;
                    </a>
                )}
                 {contact.type === 'email' && !isVerified && contact.notes && (
                    <p className="text-xs text-gray-500 mt-1 fst-italic">Note: {contact.notes}</p>
                )}
            </div>
        </div>
    );
};

const ContactContent: React.FC<{ company: Company, state: ContactState, onGenerate: () => void, onCopy: (value: string) => void, copiedValues: Set<string> }> = ({ company, state, onGenerate, onCopy, copiedValues }) => {
    const { status, contacts, sources, error } = state;

    if (status === 'idle') {
        return (
             <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <UsersIcon className="w-12 h-12 text-gray-500" />
                <p className="mt-4 text-lg font-semibold text-white">Find Key Contacts</p>
                <p className="text-gray-400 mb-6">Search for HR, recruiters, and hiring managers at {company.companyName}.</p>
                <button
                    onClick={onGenerate}
                    className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
                >
                    Find Contacts
                </button>
            </div>
        )
    }

    if (status === 'error' && error) {
        return (
            <div className="p-6">
                <ErrorMessage message={error} />
            </div>
        );
    }

    if (status === 'generating' && contacts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <ArrowPathIcon className="w-12 h-12 text-cyan-400 animate-spin" />
                <p className="mt-4 text-lg font-semibold text-white">Searching for contacts...</p>
                <p className="text-gray-400">The AI is researching {company.companyName}.</p>
            </div>
        );
    }
    
    return (
        <div className="relative h-full flex flex-col">
            <div className="flex-grow overflow-y-auto p-6 space-y-4">
                {contacts.length > 0 ? (
                    contacts.map((contact, index) => (
                        <ContactCard key={`${contact.value}-${index}`} contact={contact} onCopy={onCopy} isCopied={copiedValues.has(contact.value)} />
                    ))
                ) : (
                   status === 'done' && (
                     <div className="text-center pt-10">
                         <p className="text-gray-400">No public contacts were found for this company.</p>
                     </div>
                   )
                )}
                 {status === 'generating' && (
                    <div className="flex items-center justify-center gap-2 pt-4 text-cyan-400">
                        <ArrowPathIcon className="w-5 h-5 animate-spin" />
                        <span>Searching for more...</span>
                    </div>
                )}
            </div>
            {sources.length > 0 && (status === 'done' || status === 'generating') && (
                <div className="flex-shrink-0 p-4 bg-gray-900/50 border-t border-gray-700">
                     <SourceList sources={sources} />
                </div>
            )}
        </div>
    );
};

const DraftingView: React.FC<DraftingViewProps> = ({ companies, onBack, apiService }) => {
  const [userInfo, setUserInfo] = useState('');
  const [resumeStates, setResumeStates] = useState<Map<string, ResumeState>>(() =>
    new Map(companies.map(c => [c.companyName, { status: 'idle', content: '' }]))
  );
  const [contactStates, setContactStates] = useState<Map<string, ContactState>>(() => 
    new Map(companies.map(c => [c.companyName, { status: 'idle', contacts: [], sources: [] }]))
  );

  const [activeTab, setActiveTab] = useState<string>(companies[0]?.companyName || '');
  const [activeSubTab, setActiveSubTab] = useState<'resume' | 'contacts'>('resume');

  const [copiedResumeTabs, setCopiedResumeTabs] = useState<Set<string>>(new Set());
  const [copiedContactValues, setCopiedContactValues] = useState<Set<string>>(new Set());
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAnythingGenerating = useMemo(() => 
    Array.from(resumeStates.values()).some(s => s.status === 'generating') ||
    Array.from(contactStates.values()).some(s => s.status === 'generating'),
    [resumeStates, contactStates]
  );

  const idleResumesCount = useMemo(() => 
    Array.from(resumeStates.values()).filter(s => s.status === 'idle').length,
    [resumeStates]
  );
  
  const generateResumeForCompany = useCallback(async (company: Company) => {
    if (!userInfo) {
      alert('Please provide your skills or resume summary first.');
      return;
    }
    setResumeStates(prev => new Map(prev).set(company.companyName, { status: 'generating', content: '' }));

    try {
        const stream = apiService.draftTailoredResume(userInfo, company);
        for await (const chunk of stream) {
            setResumeStates(prev => {
                const current = prev.get(company.companyName);
                return new Map(prev).set(company.companyName, {
                    ...current!,
                    content: (current?.content || '') + chunk
                });
            });
        }
        setResumeStates(prev => new Map(prev).set(company.companyName, { ...prev.get(company.companyName)!, status: 'done' }));
    } catch (error) {
        console.error(`Failed to generate resume for ${company.companyName}:`, error);
        const errorMessage = `Sorry, an error occurred while generating the resume for ${company.companyName}. Please check your connection or try again.`;
        setResumeStates(prev => new Map(prev).set(company.companyName, { status: 'error', content: errorMessage }));
    }
  }, [userInfo, geminiService]);

  const findCompanyContacts = useCallback(async (company: Company) => {
    setContactStates(prev => new Map(prev).set(company.companyName, { status: 'generating', contacts: [], sources: [] }));

    try {
        const stream = apiService.streamCompanyContacts(company);
        for await (const result of stream) {
            if (result.contact) {
                 setContactStates(prev => {
                    const current = prev.get(company.companyName)!;
                    // Basic duplicate check
                    if (current.contacts.some(c => c.value === result.contact!.value)) {
                        return prev;
                    }
                    return new Map(prev).set(company.companyName, {
                        ...current,
                        contacts: [...current.contacts, result.contact!]
                    });
                });
            }
            if (result.sources) {
                 setContactStates(prev => {
                    const current = prev.get(company.companyName)!;
                    return new Map(prev).set(company.companyName, {
                        ...current,
                        sources: result.sources!
                    });
                });
            }
        }
        setContactStates(prev => new Map(prev).set(company.companyName, { ...prev.get(company.companyName)!, status: 'done' }));
    } catch (error) {
        console.error(`Failed to find contacts for ${company.companyName}:`, error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        setContactStates(prev => new Map(prev).set(company.companyName, { status: 'error', contacts: [], sources: [], error: errorMessage }));
    }
  }, [geminiService]);

  const handleGenerateAllResumes = async () => {
    const companiesToGenerate = companies.filter(c => resumeStates.get(c.companyName)?.status === 'idle');
    await Promise.all(companiesToGenerate.map(c => generateResumeForCompany(c)));
  };

  const handleCopy = (valueToCopy: string, type: 'resume' | 'contact', key: string) => {
    navigator.clipboard.writeText(valueToCopy);
    const setter = type === 'resume' ? setCopiedResumeTabs : setCopiedContactValues;
    const valueSet = type === 'resume' ? key : valueToCopy;

    setter(prev => new Set(prev).add(valueSet));
    setTimeout(() => {
        setter(prev => {
            const newSet = new Set(prev);
            newSet.delete(valueSet);
            return newSet;
        });
    }, 2000);
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/plain' && !file.name.endsWith('.md')) {
        alert('Unsupported file type. Please upload a .txt or .md file.');
        if(event.target) event.target.value = '';
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setUserInfo(text);
      setUploadedFileName(file.name);
    };
    reader.readAsText(file);
    if(event.target) event.target.value = '';
  };
  
  const handleCompanyTabClick = (companyName: string) => {
    setActiveTab(companyName);
    setActiveSubTab('resume'); // Default to resume tab on company change
  };

  const handleSubTabClick = (subTab: 'resume' | 'contacts') => {
    setActiveSubTab(subTab);
    if (subTab === 'contacts') {
        const company = companies.find(c => c.companyName === activeTab);
        const state = contactStates.get(activeTab);
        if (company && state?.status === 'idle') {
            findCompanyContacts(company);
        }
    }
  };

  const activeCompany = companies.find(c => c.companyName === activeTab);
  const activeResumeState = activeTab ? resumeStates.get(activeTab) : undefined;
  const activeContactState = activeTab ? contactStates.get(activeTab) : undefined;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6 lg:p-8 animate-fade-in-up">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <button onClick={onBack} className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-4">
            <ArrowLeftIcon className="w-5 h-5" />
            Back to Company Selection
          </button>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Outreach Toolkit
          </h1>
          <p className="mt-2 text-lg text-gray-400">Draft resumes and find key contacts to accelerate your job search.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-gray-800/50 p-6 rounded-2xl shadow-2xl border border-gray-700 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Your Professional Info</h2>
                   <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".txt,.md" />
                    <button onClick={handleUploadClick} disabled={isAnythingGenerating} className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        <UploadIcon className="w-5 h-5" />
                        Upload Resume
                    </button>
                </div>
                <p className="text-sm text-gray-400 mb-2">Paste your info below or upload a .txt/.md file. The more detail you provide, the better the result.</p>
                {uploadedFileName && <p className="text-xs text-green-400 mb-4 bg-green-900/50 px-2 py-1 rounded-md">Successfully loaded: <strong>{uploadedFileName}</strong></p>}
                <textarea rows={15} value={userInfo} onChange={(e) => setUserInfo(e.target.value)} placeholder="Paste your info here..." className="w-full bg-gray-700 border-gray-600 text-white rounded-lg p-3 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition flex-grow" disabled={isAnythingGenerating} />
                 <button onClick={handleGenerateAllResumes} disabled={isAnythingGenerating || !userInfo || idleResumesCount === 0} className="mt-6 w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300">
                    {isAnythingGenerating ? <><ArrowPathIcon className="animate-spin -ml-1 mr-3 h-5 w-5" />Working...</> : <><SparklesIcon className="-ml-1 mr-2 h-5 w-5" />{`Generate ${idleResumesCount > 0 ? `${idleResumesCount} ` : ''}Resume${idleResumesCount !== 1 ? 's' : ''}`}</>}
                </button>
            </div>

            <div className="bg-gray-800/50 rounded-2xl shadow-2xl border border-gray-700 flex flex-col min-h-[500px]">
                <div className="flex-shrink-0 border-b border-gray-700 p-2">
                    <div className="flex space-x-2 overflow-x-auto">
                    {companies.map(company => (
                        <button key={company.companyName} onClick={() => handleCompanyTabClick(company.companyName)} className={`flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === company.companyName ? 'bg-cyan-800 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                            {company.companyName}
                        </button>
                    ))}
                    </div>
                </div>
                <div className="flex-grow flex flex-col">
                    <div className="flex-shrink-0 border-b border-gray-700 p-2 flex gap-4">
                        <button onClick={() => handleSubTabClick('resume')} className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md ${activeSubTab === 'resume' ? 'text-cyan-400' : 'text-gray-400 hover:text-white'}`}>
                            Resume
                            {resumeStates.get(activeTab)?.status === 'generating' && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
                            {resumeStates.get(activeTab)?.status === 'done' && <CheckCircleIcon className="w-4 h-4 text-green-400" />}
                            {resumeStates.get(activeTab)?.status === 'error' && <ExclamationCircleIcon className="w-4 h-4 text-red-400" />}
                        </button>
                        <button onClick={() => handleSubTabClick('contacts')} className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md ${activeSubTab === 'contacts' ? 'text-cyan-400' : 'text-gray-400 hover:text-white'}`}>
                            <UsersIcon className="w-5 h-5" />
                            Contacts
                            {contactStates.get(activeTab)?.status === 'generating' && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
                            {contactStates.get(activeTab)?.status === 'done' && <CheckCircleIcon className="w-4 h-4 text-green-400" />}
                            {contactStates.get(activeTab)?.status === 'error' && <ExclamationCircleIcon className="w-4 h-4 text-red-400" />}
                        </button>
                    </div>
                    <div className="flex-grow">
                        {activeCompany && activeSubTab === 'resume' && activeResumeState && (
                            <ResumeContent 
                                company={activeCompany}
                                state={activeResumeState}
                                onGenerate={() => generateResumeForCompany(activeCompany)}
                                onCopy={() => handleCopy(activeResumeState.content, 'resume', activeCompany.companyName)}
                                isCopied={copiedResumeTabs.has(activeCompany.companyName)}
                            />
                        )}
                        {activeCompany && activeSubTab === 'contacts' && activeContactState && (
                             <ContactContent
                                company={activeCompany}
                                state={activeContactState}
                                onGenerate={() => findCompanyContacts(activeCompany)}
                                onCopy={(value) => handleCopy(value, 'contact', value)}
                                copiedValues={copiedContactValues}
                             />
                        )}
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default DraftingView;