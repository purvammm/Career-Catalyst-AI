import React from 'react';
import { Company } from '../types';
import { CheckCircleIcon, CircleIcon } from './Icons';


interface CompanyCardProps {
    company: Company;
    onToggle: (companyName: string) => void;
    isSelected: boolean;
    index: number;
}

const CompanyCard: React.FC<CompanyCardProps> = ({ company, onToggle, isSelected, index }) => (
    <div 
        onClick={() => onToggle(company.companyName)}
        className={`bg-gray-800/70 p-5 rounded-xl shadow-lg border cursor-pointer transition-all duration-300 flex flex-col justify-between h-full relative animate-fade-in-up ${isSelected ? 'ring-2 ring-offset-2 ring-offset-gray-900 ring-cyan-500 border-cyan-500' : 'border-gray-700 hover:border-gray-600'}`}
        style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}
    >
        <div className="absolute top-4 right-4">
            {isSelected 
                ? <CheckCircleIcon className="w-6 h-6 text-cyan-400" />
                : <CircleIcon className="w-6 h-6 text-gray-600" />
            }
        </div>
        <div>
            <h3 className="text-xl font-bold text-white pr-8">{company.companyName}</h3>
            <p className="text-gray-400 mt-2 text-sm leading-relaxed">{company.description}</p>
        </div>
        <div className="mt-4 flex items-center justify-between">
            <a 
                href={company.website} 
                target="_blank" 
                rel="noopener noreferrer" 
                onClick={(e) => e.stopPropagation()}
                className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
            >
                Visit Website &rarr;
            </a>
        </div>
    </div>
);

const CompanyCardSkeleton: React.FC = () => (
    <div className="bg-gray-800/70 p-5 rounded-xl shadow-lg border border-gray-700 h-full flex flex-col justify-between animate-pulse">
        <div>
            <div className="h-6 bg-gray-700 rounded w-3/4 mb-4"></div>
            <div className="space-y-2">
                <div className="h-4 bg-gray-700 rounded w-full"></div>
                <div className="h-4 bg-gray-700 rounded w-5/6"></div>
            </div>
        </div>
        <div className="mt-4 h-5 bg-gray-700 rounded w-1/3"></div>
    </div>
);


interface CompanyListProps {
  companies: Company[];
  onToggleSelect: (companyName: string) => void;
  selectedCompanies: Set<string>;
  isLoading: boolean;
}

const CompanyList: React.FC<CompanyListProps> = ({ companies, onToggleSelect, selectedCompanies, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => <CompanyCardSkeleton key={i} />)}
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {companies.map((company, index) => (
            <CompanyCard 
                key={company.companyName} 
                company={company} 
                onToggle={onToggleSelect}
                isSelected={selectedCompanies.has(company.companyName)}
                index={index}
            />
        ))
      }
    </div>
  );
};

export default CompanyList;