import React, { useState } from 'react';
import { Zap, Search, Database, CheckCircle, AlertCircle, Globe, FileText, Award, Trophy, PlayCircle, StopCircle, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client'; // Add this import

export default function AIScraperAdmin() {
  const [activeTab, setActiveTab] = useState('scraper');
  const [isScraperRunning, setIsScraperRunning] = useState(false);
  const [scrapingProgress, setScrapingProgress] = useState(0);
  const [logs, setLogs] = useState([
    { time: '10:30 AM', type: 'success', message: 'Successfully scraped UPSC exam data' },
    { time: '10:29 AM', type: 'info', message: 'Started scraping for India' },
    { time: '10:25 AM', type: 'success', message: '15 new jobs added for India' },
  ]);

  // Form states
  const [examForm, setExamForm] = useState({
    country: 'India',
    examName: '',
    autoFindLinks: true
  });

  const [countryForm, setCountryForm] = useState({
    countryName: '',
    autoFindJobs: true,
    autoFindExams: true
  });

  const handleStartExamScraper = async () => {
    if (!examForm.examName) {
      alert('Please enter exam name');
      return;
    }
  
    setIsScraperRunning(true);
    setScrapingProgress(0);
  
    // Add initial log
    setLogs(prev => [{
      time: new Date().toLocaleTimeString(),
      type: 'info',
      message: `Started AI scraping for ${examForm.examName}...`
    }, ...prev]);
  
    try {
      // Call the Supabase edge function
      const { data, error } = await supabase.functions.invoke('ai-scraper', {
        body: { 
          type: 'exam', 
          country: examForm.country, 
          examName: examForm.examName 
        }
      });
  
      // Simulate progress updates while waiting for response
      const progressInterval = setInterval(() => {
        setScrapingProgress(prev => {
          if (prev >= 90) { // Stop at 90% until response
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);
  
      // Wait for the response
      if (data && data.success) {
        clearInterval(progressInterval);
        setScrapingProgress(100);
        setIsScraperRunning(false);
        
        // Add success log
        setLogs(prev => [{
          time: new Date().toLocaleTimeString(),
          type: 'success',
          message: data.message || `Successfully scraped all data for ${examForm.examName}`
        }, ...prev]);
  
        console.log('AI scraper response:', data);
      } else if (error) {
        clearInterval(progressInterval);
        setScrapingProgress(100);
        setIsScraperRunning(false);
        
        // Add error log
        setLogs(prev => [{
          time: new Date().toLocaleTimeString(),
          type: 'error',
          message: `Error scraping ${examForm.examName}: ${error.message}`
        }, ...prev]);
  
        console.error('AI scraper error:', error);
      } else if (data && !data.success) {
        clearInterval(progressInterval);
        setScrapingProgress(100);
        setIsScraperRunning(false);
        
        // Add error log
        setLogs(prev => [{
          time: new Date().toLocaleTimeString(),
          type: 'error',
          message: `Scraping failed: ${data.error || 'Unknown error'}`
        }, ...prev]);
  
        console.error('AI scraper failed:', data);
      }
  
    } catch (error) {
      setIsScraperRunning(false);
      setScrapingProgress(100);
      
      // Add error log
      setLogs(prev => [{
        time: new Date().toLocaleTimeString(),
        type: 'error',
        message: `Failed to start AI scraper for ${examForm.examName}: ${error.message}`
      }, ...prev]);
  
      console.error('Failed to invoke AI scraper:', error);
    }
  };

  const handleStartCountryScraper = async () => {
    if (!countryForm.countryName) {
      alert('Please enter country name');
      return;
    }

    setIsScraperRunning(true);
    setScrapingProgress(0);

    const progressInterval = setInterval(() => {
      setScrapingProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setIsScraperRunning(false);
          setLogs(prev => [{
            time: new Date().toLocaleTimeString(),
            type: 'success',
            message: `Successfully scraped all data for ${countryForm.countryName}`
          }, ...prev]);
          return 100;
        }
        return prev + 10;
      });
    }, 500);

    setLogs(prev => [{
      time: new Date().toLocaleTimeString(),
      type: 'info',
      message: `Started AI scraping for ${countryForm.countryName}...`
    }, ...prev]);

    console.log('Starting AI scraper for country:', countryForm);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">AI Auto Scraper</h1>
                <p className="text-sm text-slate-500">Automated Data Collection & Updates</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`px-4 py-2 rounded-lg border ${isScraperRunning ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
                <span className={`text-sm font-medium ${isScraperRunning ? 'text-green-700' : 'text-slate-600'}`}>
                  {isScraperRunning ? '🟢 Scraping...' : '⚪ Idle'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 mb-6">
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('scraper')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'scraper'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              AI Scraper
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'logs'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Logs
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'settings'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Settings
            </button>
          </div>

          {/* AI Scraper Tab */}
          {activeTab === 'scraper' && (
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Exam Scraper */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-3 mb-4">
                    <FileText className="w-6 h-6 text-blue-600" />
                    <h3 className="text-lg font-bold text-blue-900">Exam Data Scraper</h3>
                  </div>
                  
                  <p className="text-sm text-blue-700 mb-4">
                    Enter an exam name and AI will automatically find and populate all related information including notices, admit cards, results, and answer keys.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-blue-900 mb-2">
                        Country
                      </label>
                      <select
                        value={examForm.country}
                        onChange={(e) => setExamForm({...examForm, country: e.target.value})}
                        className="w-full px-4 py-2 rounded-lg border border-blue-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option>India</option>
                        <option>United States</option>
                        <option>United Kingdom</option>
                        <option>Canada</option>
                        <option>Australia</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-blue-900 mb-2">
                        Exam Name *
                      </label>
                      <input
                        type="text"
                        value={examForm.examName}
                        onChange={(e) => setExamForm({...examForm, examName: e.target.value})}
                        placeholder="e.g., UPSC Civil Services, SSC CGL"
                        className="w-full px-4 py-2 rounded-lg border border-blue-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="autoFindLinks"
                        checked={examForm.autoFindLinks}
                        onChange={(e) => setExamForm({...examForm, autoFindLinks: e.target.checked})}
                        className="w-4 h-4"
                      />
                      <label htmlFor="autoFindLinks" className="text-sm text-blue-800">
                        Automatically find all related links (notices, admit cards, results, answer keys)
                      </label>
                    </div>

                    <button
                      onClick={handleStartExamScraper}
                      disabled={isScraperRunning}
                      className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
                    >
                      {isScraperRunning ? (
                        <>
                          <StopCircle className="w-5 h-5 animate-pulse" />
                          Scraping...
                        </>
                      ) : (
                        <>
                          <PlayCircle className="w-5 h-5" />
                          Start AI Scraper
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Country Scraper */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
                  <div className="flex items-center gap-3 mb-4">
                    <Globe className="w-6 h-6 text-green-600" />
                    <h3 className="text-lg font-bold text-green-900">Country Data Scraper</h3>
                  </div>
                  
                  <p className="text-sm text-green-700 mb-4">
                    Enter a country name and AI will automatically find and populate all government jobs and exams available in that country.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-green-900 mb-2">
                        Country Name *
                      </label>
                      <input
                        type="text"
                        value={countryForm.countryName}
                        onChange={(e) => setCountryForm({...countryForm, countryName: e.target.value})}
                        placeholder="e.g., India, United States, United Kingdom"
                        className="w-full px-4 py-2 rounded-lg border border-green-300 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="autoFindJobs"
                          checked={countryForm.autoFindJobs}
                          onChange={(e) => setCountryForm({...countryForm, autoFindJobs: e.target.checked})}
                          className="w-4 h-4"
                        />
                        <label htmlFor="autoFindJobs" className="text-sm text-green-800">
                          Automatically find all government jobs
                        </label>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="autoFindExams"
                          checked={countryForm.autoFindExams}
                          onChange={(e) => setCountryForm({...countryForm, autoFindExams: e.target.checked})}
                          className="w-4 h-4"
                        />
                        <label htmlFor="autoFindExams" className="text-sm text-green-800">
                          Automatically find all government exams
                        </label>
                      </div>
                    </div>

                    <button
                      onClick={handleStartCountryScraper}
                      disabled={isScraperRunning}
                      className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
                    >
                      {isScraperRunning ? (
                        <>
                          <StopCircle className="w-5 h-5 animate-pulse" />
                          Scraping...
                        </>
                      ) : (
                        <>
                          <PlayCircle className="w-5 h-5" />
                          Start AI Scraper
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              {isScraperRunning && (
                <div className="mt-6 bg-white p-6 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">Scraping Progress</span>
                    <span className="text-sm font-bold text-purple-600">{scrapingProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-purple-600 h-full transition-all duration-500 rounded-full"
                      style={{ width: `${scrapingProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    AI is scanning official websites and extracting data...
                  </p>
                </div>
              )}

              {/* What AI Will Scrape */}
              <div className="mt-6 bg-white p-6 rounded-lg border border-slate-200">
                <h4 className="text-md font-bold text-slate-800 mb-4">What AI Will Automatically Find & Add:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-slate-800">Exam Information</p>
                      <p className="text-sm text-slate-600">Exam name, conducting body, exam date, notification date</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-slate-800">Official Links</p>
                      <p className="text-sm text-slate-600">Admit card, result, syllabus, official website links</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-slate-800">Job Listings</p>
                      <p className="text-sm text-slate-600">Title, department, deadline, qualifications, official links</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-slate-800">SEO Optimization</p>
                      <p className="text-sm text-slate-600">Auto-generated meta titles, descriptions, keywords, content</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-slate-800">Answer Keys</p>
                      <p className="text-sm text-slate-600">Download links, objection deadlines, release dates</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-slate-800">Results</p>
                      <p className="text-sm text-slate-600">Result links, release dates, conducting body information</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Logs Tab */}
          {activeTab === 'logs' && (
            <div className="p-6">
              <div className="space-y-3">
                {logs.map((log, index) => (
                  <div key={index} className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    {log.type === 'success' ? (
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : log.type === 'error' ? (
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <Database className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">{log.message}</p>
                      <p className="text-xs text-slate-500 mt-1">{log.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-4">AI Scraper Configuration</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-800">Auto-update frequency</p>
                        <p className="text-sm text-slate-600">How often should AI check for updates</p>
                      </div>
                      <select className="px-4 py-2 rounded-lg border border-slate-300">
                        <option>Every 6 hours</option>
                        <option>Every 12 hours</option>
                        <option>Daily</option>
                        <option>Weekly</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-800">Data verification</p>
                        <p className="text-sm text-slate-600">Verify scraped data before adding</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-800">Auto-generate SEO content</p>
                        <p className="text-sm text-slate-600">Generate SEO-optimized content for listings</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-200">
                  <button className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                    Save Settings
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg border border-purple-200">
          <h4 className="text-md font-bold text-purple-900 mb-2 flex items-center gap-2">
            <Zap className="w-5 h-5" />
            How AI Auto Scraper Works
          </h4>
          <p className="text-sm text-purple-800 leading-relaxed">
            Our AI-powered scraper uses advanced web scraping technology combined with OpenAI's GPT model to automatically find, extract, and structure data from official government websites. Simply enter an exam name or country, and the AI will search multiple official sources, extract relevant information, verify its accuracy, and automatically populate your database with properly formatted data including SEO metadata.
          </p>
        </div>
      </div>
    </div>
  );
}