import React, { useState, useCallback, useRef } from 'react';
import { Company, GroundingSource } from './types';
import * as geminiService from './services/geminiService';
import SearchForm from './components/SearchForm';
import CompanyList from './components/CompanyList';
import DraftingView from './components/DraftingView';
import { SparklesIcon, BriefcaseIcon } from './components/Icons';
import SourceList from './components/SourceList';
import ErrorMessage from './components/ErrorMessage';

type SearchStatus = 'idle' | 'searching' | 'stopped' | 'error';

const normalizeCompanyName = (name: string): string => {
    return name.toLowerCase().replace(/,?\s+(inc|llc|ltd|corp|corporation|incorporated|co)\.?$/g, '').trim();
};

export default function App() {
  const [location, setLocation] = useState<string>('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [sources, setSources] = useState<GroundingSource[]>([]);
  const [selectedCompanyNames, setSelectedCompanyNames] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [appStage, setAppStage] = useState<'search' | 'draft'>('search');
  const [searchStatus, setSearchStatus] = useState<SearchStatus>('idle');
  const stopSearchRef = useRef(false);
  const foundCompanyNamesRef = useRef(new Set<string>());

  const handleSearch = useCallback(async (searchLocation: string) => {
    if (!searchLocation) {
      setError('Please provide a location.');
      return;
    }
    
    setSearchStatus('searching');
    stopSearchRef.current = false;
    foundCompanyNamesRef.current.clear();
    setError(null);
    setCompanies([]);
    setSources([]);
    setSelectedCompanyNames(new Set());
    setLocation(searchLocation);
    
    try {
      const stream = geminiService.streamCompaniesInLocation(searchLocation);
      for await (const result of stream) {
        if (stopSearchRef.current) {
          break;
        }
        if (result.company) {
            const normalizedName = normalizeCompanyName(result.company.companyName);
            if (!foundCompanyNamesRef.current.has(normalizedName)) {
                foundCompanyNamesRef.current.add(normalizedName);
                setCompanies(prev => [...prev, result.company!]);
            }
        }
        if (result.sources) {
          setSources(result.sources);
        }
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch company data. The response may have been blocked or invalid. Please try again.');
      setSearchStatus('error');
    } finally {
        // This 'finally' block ensures the status is correctly updated
        // whether the search completes or is stopped by the user.
        setSearchStatus(prevStatus => prevStatus === 'searching' ? 'stopped' : prevStatus);
    }
  }, []);

  const handleStopSearch = useCallback(() => {
    // This just signals the search loop to stop.
    // The 'finally' block in handleSearch will update the status.
    stopSearchRef.current = true;
  }, []);

  const handleToggleCompanySelection = (companyName: string) => {
    setSelectedCompanyNames(prev => {
      const newSet = new Set(prev);
      if (newSet.has(companyName)) {
        newSet.delete(companyName);
      } else {
        newSet.add(companyName);
      }
      return newSet;
    });
  };

  const handleProceedToDraft = () => {
    if (selectedCompanyNames.size > 0) {
      setAppStage('draft');
    }
  };
  
  const handleSelectAllToggle = () => {
    if (selectedCompanyNames.size === companies.length) {
      setSelectedCompanyNames(new Set());
    } else {
      setSelectedCompanyNames(new Set(companies.map(c => c.companyName)));
    }
  };

  if (appStage === 'draft') {
    return (
      <DraftingView
        companies={companies.filter(c => selectedCompanyNames.has(c.companyName))}
        onBack={() => {
          setAppStage('search');
        }}
        geminiService={geminiService}
      />
    );
  }

  const noResultsFound = searchStatus === 'stopped' && companies.length === 0 && location && !error;
  const showBottomBar = companies.length > 0 && searchStatus !== 'searching';
  const allCompaniesSelected = companies.length > 0 && selectedCompanyNames.size === companies.length;
  
  const getHeaderMessage = () => {
    const companyCount = companies.length;
    switch(searchStatus) {
      case 'searching':
        return `Searching... Found ${companyCount} Companies in ${location}`;
      case 'stopped':
        return `Search Complete: Found ${companyCount} Companies in ${location}`;
      case 'error':
        return `Search Failed for ${location}`;
      case 'idle':
        return companies.length > 0 ? `Found ${companyCount} Companies in ${location}` : `Ready to find your next role?`;
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-blue-500 text-transparent bg-clip-text inline-block">
            Career Catalyst AI
          </h1>
          <p className="mt-3 text-lg text-gray-400 max-w-2xl mx-auto">
            Step 1: Find tech companies. Step 2: Select your targets and draft tailored resumes instantly.
          </p>
        </header>

        <main className="pb-24">
          <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl shadow-2xl border border-gray-700">
            <SearchForm
              status={searchStatus}
              onSubmit={handleSearch}
              onStop={handleStopSearch}
              location={location}
              setLocation={setLocation}
            />
          </div>

          {searchStatus === 'error' && error && <ErrorMessage message={error} />}

          {(searchStatus !== 'idle' || companies.length > 0) && !noResultsFound ? (
             <div className="mt-10">
                <div className="flex items-center gap-3 mb-4">
                  <BriefcaseIcon className="w-6 h-6 text-cyan-400" />
                  <h2 className="text-2xl font-bold text-white">
                    {getHeaderMessage()}
                  </h2>
                </div>
                <CompanyList
                  companies={companies}
                  onToggleSelect={handleToggleCompanySelection}
                  selectedCompanies={selectedCompanyNames}
                  isLoading={searchStatus === 'searching' && companies.length === 0}
                />
             </div>
          ) : null}
          
          {noResultsFound && (
             <div className="text-center py-16 px-6 bg-gray-800/50 mt-10 rounded-2xl border border-gray-700">
                <h3 className="mt-4 text-lg font-semibold text-white">No Companies Found</h3>
                <p className="mt-2 text-sm text-gray-400">
                    Your search for "{location}" did not return any results. Please try a different location.
                </p>
            </div>
          )}

          {sources.length > 0 && (searchStatus === 'searching' || searchStatus === 'stopped') && (
            <div className="mt-8">
              <SourceList sources={sources} />
            </div>
          )}

          {searchStatus === 'idle' && companies.length === 0 && (
            <div className="text-center py-16 px-6 bg-gray-800/50 mt-10 rounded-2xl border border-gray-700">
              <SparklesIcon className="mx-auto h-12 w-12 text-gray-500" />
              <h3 className="mt-4 text-lg font-semibold text-white">Ready to find your next role?</h3>
              <p className="mt-2 text-sm text-gray-400">
                Enter a location above to begin your search.
              </p>
            </div>
          )}
        </main>
      </div>

      {showBottomBar && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900/80 backdrop-blur-sm p-4 border-t border-gray-700 animate-fade-in-up">
            <div className="max-w-4xl mx-auto flex justify-between items-center">
                 <div>
                    <button 
                      onClick={handleSelectAllToggle}
                      className="text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={companies.length === 0}
                    >
                      {allCompaniesSelected ? 'Deselect All' : 'Select All'}
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    <p className="text-white font-medium">
                        <span className="bg-cyan-500 text-gray-900 rounded-full h-6 w-6 inline-flex items-center justify-center mr-2">{selectedCompanyNames.size}</span>
                        {selectedCompanyNames.size === 1 ? 'company selected' : 'companies selected'}
                    </p>
                    <button
                      onClick={handleProceedToDraft}
                      disabled={selectedCompanyNames.size === 0}
                      className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Next: Draft Resumes &rarr;
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}