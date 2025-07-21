import React from 'react';
import { ArrowPathIcon, SparklesIcon, StopIcon } from './Icons';

interface SearchFormProps {
  status: 'idle' | 'searching' | 'completed' | 'stopped' | 'error';
  onSubmit: (location: string) => void;
  onStop: () => void;
  location: string;
  setLocation: React.Dispatch<React.SetStateAction<string>>;
}

const SearchForm: React.FC<SearchFormProps> = ({ status, onSubmit, onStop, location, setLocation }) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(location);
  };

  const isSearching = status === 'searching';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="location" className="block text-sm font-medium text-gray-300 mb-2">
          Target Location
        </label>
        <input
          type="text"
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g., Austin, Texas"
          className="w-full bg-gray-700 border-gray-600 text-white rounded-lg p-3 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
          required
          disabled={isSearching}
        />
      </div>
      <div className="flex justify-end">
        {isSearching ? (
          <button
            type="button"
            onClick={onStop}
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-red-500 transition-all duration-300"
          >
            <StopIcon className="-ml-1 mr-2 h-5 w-5" />
            Stop Search
          </button>
        ) : (
          <button
            type="submit"
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500 transition-all duration-300"
          >
            <SparklesIcon className="-ml-1 mr-2 h-5 w-5" />
            Find Companies
          </button>
        )}
      </div>
    </form>
  );
};

export default SearchForm;