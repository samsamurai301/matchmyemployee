import { useState } from "react";
import ModelSelector from "./components/ModelSelector";
import ResumeForm from "./components/ResumeForm";
import ResultsDisplay from "./components/ResultsDisplay";
import { FaFileAlt, FaLightbulb, FaInfoCircle } from "react-icons/fa";

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
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<"input" | "results">(
    analysisResult ? "results" : "input"
  );
  const [showWarning] = useState(true);

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
          <div className="text-sm text-gray-500">
            AI-Powered Resume Analysis
          </div>
        </div>
      </header>

      {/* Warning Banner */}
      {showWarning && (
        <div className="bg-amber-50 border-y border-amber-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            {/* Left side: icon + text */}
            <div className="flex items-center">
              <FaInfoCircle className="text-amber-500 text-lg mr-2 flex-shrink-0" />
              <p className="text-amber-700 text-sm">
                <span className="font-medium">Note:</span> Only free models are
                available by default. For access to premium models, please
                consider supporting this project.{" "}
                <strong>xAI: Grok 4 Fast (free)</strong> is working well for
                many users.
              </p>
            </div>

          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-xl overflow-hidden">
          {/* Navigation Tabs */}
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab("input")}
              className={`flex-1 py-4 px-6 text-center font-medium transition-colors duration-200
                ${
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
              className={`flex-1 py-4 px-6 text-center font-medium transition-colors duration-200
                ${
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

          {/* Content Area */}
          <div className="p-6">
            {activeTab === "input" ? (
              <div className="space-y-8">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <h2 className="text-lg font-medium text-blue-800 mb-2 flex items-center">
                    <FaLightbulb className="mr-2 text-blue-600" />
                    How it works
                  </h2>
                  <p className="text-blue-700">
                    Upload a resume and job description to get AI-powered
                    insights on match quality, key strengths, and improvement
                    opportunities.
                  </p>
                </div>

                {/* Model Selector */}
                <ModelSelector
                  selectedModel={selectedModel}
                  setSelectedModel={setSelectedModel}
                />

                {/* Resume Form - updated to receive setSelectedModel */}
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
      </div>
    </div>
  );
}

export default App;
