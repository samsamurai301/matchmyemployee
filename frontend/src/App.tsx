import { useState, useEffect, useCallback, useRef } from "react";
import ModelSelector from "./components/ModelSelector";
import ResumeForm from "./components/ResumeForm";
import ResultsDisplay from "./components/ResultsDisplay";
import { 
  FaFileAlt, 
  FaLightbulb, 
  FaInfoCircle, 
  FaExclamationTriangle, 
  FaRedoAlt 
} from "react-icons/fa";

const API_URL = import.meta.env.VITE_API_URL as string;

export interface AnalysisResult {
  relevancy_score?: {
    overall: number;
    skills: number;
    experience: number;
    education: number;
  };
  reliability_score?: number;
  learning_potential?: number;
  suspicious?: string;
  red_flags?: string[];
  key_achievements?: {
    directly_relevant: string[];
    transferable: string[];
  };
  model_used?: string;
  raw_llm_response?: string;
  error?: string;
}

function App() {
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<"input" | "results">(analysisResult ? "results" : "input");
  const [showWarning, setShowWarning] = useState(true);

  // Backend health state
  const [backendStatus, setBackendStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');
  const [retrySeconds, setRetrySeconds] = useState(15);
  const retryIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start retry countdown
  const startRetryCountdown = useCallback(() => {
    if (retryIntervalRef.current) {
      clearInterval(retryIntervalRef.current);
    }

    setRetrySeconds(15); // Reset

    retryIntervalRef.current = setInterval(() => {
      setRetrySeconds(prev => {
        if (prev <= 1) {
          checkBackendHealth();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Function to check backend health
  const checkBackendHealth = useCallback(async () => {
    try {
      setBackendStatus("checking");
      const response = await fetch(`${API_URL}/health`, { 
        method: "GET",
        headers: { "Cache-Control": "no-cache" }
      });

      if (response.ok) {
        setBackendStatus("available");
        if (retryIntervalRef.current) {
          clearInterval(retryIntervalRef.current);
          retryIntervalRef.current = null;
        }
      } else {
        setBackendStatus("unavailable");
        startRetryCountdown();
      }
    } catch (error) {
      console.error("Backend health check failed:", error);
      setBackendStatus("unavailable");
      startRetryCountdown();
    }
  }, [startRetryCountdown]);

  // Manual retry handler
  const handleManualRetry = () => {
    if (retryIntervalRef.current) {
      clearInterval(retryIntervalRef.current);
      retryIntervalRef.current = null;
    }
    checkBackendHealth();
  };

  // On mount
  useEffect(() => {
    checkBackendHealth();
    return () => {
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current);
      }
    };
  }, [checkBackendHealth]);

  // Function to handle model change request from results
  const handleModelChangeRequest = () => {
    setActiveTab("input");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 text-gray-900">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FaFileAlt className="text-blue-600 text-2xl" />
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              MatchMyEmployee
            </h1>
          </div>
          <div className="text-sm text-gray-500">AI-Powered Resume Analysis</div>
        </div>
      </header>

      {/* Warning Banner */}
      {showWarning && (
        <div className="bg-amber-50 border-y border-amber-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center">
              <FaInfoCircle className="text-amber-500 text-lg mr-2 flex-shrink-0" />
              <p className="text-amber-700 text-sm">
                <span className="font-medium">Note:</span> Only free models are available by default. 
                For access to premium models, please consider supporting this project.{" "}
                <strong>xAI: Grok 4 Fast (free)</strong> is working well for many users.
              </p>
            </div>
            <button 
              onClick={() => setShowWarning(false)} 
              className="text-amber-500 hover:text-amber-700 text-xl leading-none"
              aria-label="Dismiss"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Backend Status Banner */}
      {backendStatus === "unavailable" && (
        <div className="bg-red-50 border-y border-red-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center">
              <FaExclamationTriangle className="text-red-500 text-lg mr-2 flex-shrink-0" />
              <p className="text-red-700 text-sm">
                <span className="font-medium">Server Unavailable:</span> We're having trouble connecting to our servers.
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button 
                onClick={handleManualRetry}
                className="flex items-center bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1 rounded-md transition-colors"
              >
                <FaRedoAlt className="mr-1" />
                Retry Now
              </button>
              <span className="text-sm text-red-600">
                Retrying in {retrySeconds}s
              </span>
            </div>
          </div>
        </div>
      )}

      {backendStatus === "checking" && (
        <div className="bg-blue-50 border-y border-blue-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
            <p className="text-blue-700 text-sm text-center">
              Connecting to servers...
            </p>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {backendStatus === "available" ? (
          <div className="bg-white rounded-xl shadow-xl overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab("input")}
                className={`flex-1 py-4 px-6 text-center font-medium transition-colors duration-200 ${
                  activeTab === "input"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-500 hover:text-blue-600"
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <FaFileAlt />
                  <span>Resume Analysis</span>
                </div>
              </button>

              <button
                onClick={() => setActiveTab("results")}
                className={`flex-1 py-4 px-6 text-center font-medium transition-colors duration-200 ${
                  activeTab === "results"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-500 hover:text-blue-600"
                }`}
                disabled={!analysisResult}
              >
                <div className="flex items-center justify-center space-x-2">
                  <FaLightbulb />
                  <span>Results</span>
                </div>
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {activeTab === "input" ? (
                <div className="space-y-8">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <h2 className="text-lg font-medium text-blue-800 mb-2 flex items-center">
                      <FaLightbulb className="mr-2 text-blue-600" />
                      How it works
                    </h2>
                    <p className="text-blue-700">
                      Upload a resume and job description to get AI-powered insights.
                    </p>
                  </div>

                  <ModelSelector
                    selectedModel={selectedModel}
                    setSelectedModel={setSelectedModel}
                  />

                  <ResumeForm
                    selectedModel={selectedModel}
                    setSelectedModel={setSelectedModel}
                    setAnalysisResult={setAnalysisResult}
                    onAnalysisComplete={() => setActiveTab("results")}
                  />
                </div>
              ) : (
                <ResultsDisplay
                  result={analysisResult}
                  onNewAnalysis={() => setActiveTab("input")}
                  onChangeModel={handleModelChangeRequest}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-xl p-8 text-center">
            <div className="animate-pulse">
              <FaExclamationTriangle className="text-5xl text-amber-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Server Connection Issue</h2>
              <p className="text-gray-600 mb-6">
                We're having trouble connecting to our backend services. Your data is safe.
              </p>

              {backendStatus === "checking" ? (
                <div className="flex justify-center items-center space-x-2">
                  <div className="w-4 h-4 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: "0s" }}></div>
                  <div className="w-4 h-4 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                  <div className="w-4 h-4 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                </div>
              ) : (
                <button
                  onClick={handleManualRetry}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <div className="flex items-center">
                    <FaRedoAlt className="mr-2" />
                    <span>Retry Connection</span>
                    <span className="ml-2 text-xs bg-blue-700 px-2 py-1 rounded-full">
                      {retrySeconds}s
                    </span>
                  </div>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
