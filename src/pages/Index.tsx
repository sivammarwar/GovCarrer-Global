import { useState, useEffect } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { CountrySelector } from "@/components/CountrySelector";
import { Dashboard } from "@/components/Dashboard";
import { DbCountry } from "@/hooks/useData";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [selectedCountry, setSelectedCountry] = useState<DbCountry | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Don't use the scroll restoration hook here, we'll handle it manually after data loads

  // Read country from URL on mount and when URL changes
  useEffect(() => {
    const loadCountryFromUrl = async () => {
      const countryId = searchParams.get('country');
      
      if (countryId) {
        // Fetch the country data from database
        const { data, error } = await supabase
          .from('countries')
          .select('*')
          .eq('id', countryId)
          .single();
        
        if (data && !error) {
          setSelectedCountry(data as DbCountry);
        } else {
          // If country not found, clear the URL param
          setSearchParams({});
        }
      }
      
      setLoading(false);
    };

    loadCountryFromUrl();
  }, [searchParams, setSearchParams]);

  // Restore scroll position after data is loaded
  useEffect(() => {
    if (!loading && selectedCountry && location.state) {
      const { scrollPosition, examId } = location.state;
      
      // Wait for content to render
      const timer = setTimeout(() => {
        // Try to scroll to specific exam element first (more accurate)
        if (examId) {
          const element = document.getElementById(`exam-${examId}`);
          if (element) {
            element.scrollIntoView({ 
              behavior: 'instant', 
              block: 'center' // Center the exam card in viewport
            });
            return;
          }
        }
        
        // Fallback to scroll position
        if (scrollPosition !== undefined) {
          window.scrollTo({
            top: scrollPosition,
            behavior: 'instant'
          });
        }
      }, 300); // Reduced delay since element scrolling is more reliable
      
      return () => clearTimeout(timer);
    }
  }, [loading, selectedCountry, location.state]);

  const handleSelectCountry = (country: DbCountry) => {
    setSelectedCountry(country);
    // Update URL when country is selected
    setSearchParams({ country: country.id });
  };

  const handleChangeCountry = () => {
    setSelectedCountry(null);
    // Clear URL when going back to country selector
    setSearchParams({});
  };

  // Show loading state while fetching country from URL
  if (loading && searchParams.get('country')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {selectedCountry ? (
        <Dashboard
          country={selectedCountry}
          onChangeCountry={handleChangeCountry}
        />
      ) : (
        <CountrySelector onSelectCountry={handleSelectCountry} />
      )}
    </>
  );
};

export default Index;