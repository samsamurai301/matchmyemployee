import React from 'react';
import { type AnalysisResult } from '../App';
import { 
  FaCheckCircle, 
  FaExclamationTriangle, 
  FaChartBar, 
  FaArrowRight, 
  FaGraduationCap,
  FaTools,
  FaBriefcase,
  FaExclamationCircle,
  FaRobot,
  FaRedoAlt,
  FaExchangeAlt
} from 'react-icons/fa';

interface Props {
  result: AnalysisResult | null;
  onNewAnalysis: () => void;
  onChangeModel?: () => void;
}

const ResultsDisplay: React.FC<Props> = ({ result, onNewAnalysis, onChangeModel }) => {
  if (!result) {
    return (
      <div className="text-center p-8">
        <p>No analysis results available</p>
        <button 
          onClick={onNewAnalysis}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          Start New Analysis
        </button>
      </div>
    );
  }

  if (result.error) {
    // Check if error might be related to model issues
    const isModelError = result.error.includes("Model request failed") || 
                        result.error.includes("LLM did not return valid JSON") ||
                        result.error.includes("timeout") ||
                        result.error.includes("429");

    return (
      <div className={`border rounded-lg p-6 text-center ${isModelError ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
        <div className="flex flex-col items-center">
          {isModelError ? (
            <FaExchangeAlt className="text-amber-500 text-3xl mb-2" />
          ) : (
            <FaExclamationCircle className="text-red-500 text-3xl mb-2" />
          )}
          
          <h3 className={`text-lg font-medium ${isModelError ? 'text-amber-800' : 'text-red-800'}`}>
            {isModelError ? "Model Error" : "Analysis Error"}
          </h3>
          
          <p className={`mt-2 ${isModelError ? 'text-amber-600' : 'text-red-600'}`}>{result.error}</p>
          
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-3">
            {isModelError && onChangeModel && (
              <button 
                onClick={onChangeModel}
                className="flex items-center bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                <FaExchangeAlt className="mr-2" />
                Try Different Model
              </button>
            )}
            
            <button 
              onClick={onNewAnalysis}
              className={`flex items-center ${
                isModelError 
                  ? 'bg-white border border-amber-500 text-amber-700 hover:bg-amber-50' 
                  : 'bg-red-600 hover:bg-red-700 text-white'
              } px-6 py-3 rounded-lg font-medium transition-colors`}
            >
              <FaRedoAlt className="mr-2" />
              Start New Analysis
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Get match percentage from overall score (if available)
  const matchPercentage = result.relevancy_score?.overall 
    ? Math.round(result.relevancy_score.overall) 
    : null;

  // Determine color based on match percentage
  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Format scores to percentages
  const formatScore = (score: number | undefined) => 
    score !== undefined ? `${Math.round(score)}%` : 'N/A';

  return (
    <div className="space-y-8">
      {/* Header with summary */}
      <div className="text-center">
        <h2 className="text-2xl font-bold">Resume Analysis Results</h2>
        {matchPercentage !== null && (
          <div className="mt-4 flex flex-col items-center">
            <div className="relative">
              <svg className="w-32 h-32">
                <circle 
                  className="text-gray-200" 
                  strokeWidth="8" 
                  stroke="currentColor" 
                  fill="transparent" 
                  r="56" 
                  cx="64" 
                  cy="64"
                />
                <circle 
                  className={`${matchPercentage >= 80 ? 'text-green-500' : 
                    matchPercentage >= 60 ? 'text-yellow-500' : 'text-red-500'}`}
                  strokeWidth="8" 
                  strokeDasharray={`${matchPercentage * 3.51}, 351`} 
                  strokeLinecap="round" 
                  stroke="currentColor" 
                  fill="transparent" 
                  r="56" 
                  cx="64" 
                  cy="64"
                  transform="rotate(-90 64 64)"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold">{matchPercentage}%</span>
              </div>
            </div>
            <p className="mt-2 text-lg font-medium">
              Match Score
            </p>
          </div>
        )}
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Relevancy Scores */}
        {result.relevancy_score && (
          <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
            <div className="flex items-center mb-3">
              <FaChartBar className="text-blue-600 text-xl mr-2" />
              <h3 className="text-lg font-semibold">Relevancy Scores</h3>
            </div>
            <div className="space-y-4">
              {result.relevancy_score.skills !== undefined && (
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="flex items-center text-sm font-medium">
                      <FaTools className="text-gray-500 mr-1" /> Skills
                    </span>
                    <span className={`text-sm font-bold ${getScoreColor(result.relevancy_score.skills)}`}>
                      {formatScore(result.relevancy_score.skills)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        result.relevancy_score.skills >= 0.8 ? 'bg-green-500' : 
                        result.relevancy_score.skills >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${result.relevancy_score.skills}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              {result.relevancy_score.experience !== undefined && (
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="flex items-center text-sm font-medium">
                      <FaBriefcase className="text-gray-500 mr-1" /> Experience
                    </span>
                    <span className={`text-sm font-bold ${getScoreColor(result.relevancy_score.experience)}`}>
                      {formatScore(result.relevancy_score.experience)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        result.relevancy_score.experience >= 0.8 ? 'bg-green-500' : 
                        result.relevancy_score.experience >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${result.relevancy_score.experience}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              {result.relevancy_score.education !== undefined && (
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="flex items-center text-sm font-medium">
                      <FaGraduationCap className="text-gray-500 mr-1" /> Education
                    </span>
                    <span className={`text-sm font-bold ${getScoreColor(result.relevancy_score.education)}`}>
                      {formatScore(result.relevancy_score.education)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        result.relevancy_score.education >= 0.8 ? 'bg-green-500' : 
                        result.relevancy_score.education >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${result.relevancy_score.education}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Additional Metrics */}
        <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
          <div className="flex items-center mb-4">
            <FaChartBar className="text-blue-600 text-xl mr-2" />
            <h3 className="text-lg font-semibold">Additional Metrics</h3>
          </div>
          
          <div className="space-y-4">
            {result.reliability_score !== undefined && (
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm font-medium">Reliability Score</span>
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                  result.reliability_score >= 0.8 ? 'bg-green-100 text-green-800' : 
                  result.reliability_score >= 0.6 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                }`}>
                  {formatScore(result.reliability_score)}
                </span>
              </div>
            )}
            
            {result.learning_potential !== undefined && (
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm font-medium">Learning Potential</span>
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                  result.learning_potential >= 0.8 ? 'bg-green-100 text-green-800' : 
                  result.learning_potential >= 0.6 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                }`}>
                  {formatScore(result.learning_potential)}
                </span>
              </div>
            )}

            {result.model_used && (
              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-medium flex items-center">
                  <FaRobot className="text-gray-500 mr-1" /> Model Used
                </span>
                <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  {result.model_used}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Key Achievements */}
      {result.key_achievements && (
        <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
          <div className="flex items-center mb-4">
            <FaCheckCircle className="text-green-600 text-xl mr-2" />
            <h3 className="text-lg font-semibold">Key Achievements</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {result.key_achievements.directly_relevant && result.key_achievements.directly_relevant.length > 0 && (
              <div>
                <h4 className="font-medium text-blue-800 mb-2">Directly Relevant</h4>
                <ul className="space-y-2">
                  {result.key_achievements.directly_relevant.map((achievement, i) => (
                    <li key={i} className="flex items-start">
                      <span className="text-green-500 mr-2 mt-1">
                        <FaCheckCircle />
                      </span>
                      <span className="text-sm">{achievement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {result.key_achievements.transferable && result.key_achievements.transferable.length > 0 && (
              <div>
                <h4 className="font-medium text-blue-800 mb-2">Transferable Skills</h4>
                <ul className="space-y-2">
                  {result.key_achievements.transferable.map((skill, i) => (
                    <li key={i} className="flex items-start">
                      <span className="text-blue-500 mr-2 mt-1">
                        <FaArrowRight />
                      </span>
                      <span className="text-sm">{skill}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Red Flags */}
      {result.red_flags && result.red_flags.length > 0 && (
        <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
          <div className="flex items-center mb-4">
            <FaExclamationTriangle className="text-amber-500 text-xl mr-2" />
            <h3 className="text-lg font-semibold">Areas for Improvement</h3>
          </div>
          
          <ul className="space-y-2">
            {result.red_flags.map((flag, i) => (
              <li key={i} className="flex items-start bg-amber-50 p-3 rounded-lg">
                <span className="text-amber-500 mr-2 mt-1">
                  <FaExclamationTriangle />
                </span>
                <span className="text-sm">{flag}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-center pt-4">
        <button 
          onClick={onNewAnalysis}
          className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          <FaRedoAlt className="mr-2" />
          Start New Analysis
        </button>
      </div>
    </div>
  );
};

export default ResultsDisplay;
