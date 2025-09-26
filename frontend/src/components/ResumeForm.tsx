import { useState, useRef } from "react";
import { type AnalysisResult } from "../App";
import { type ModelInfo } from "./ModelSelector";
import {
  FaCloudUploadAlt,
  FaFilePdf,
  FaFileWord,
  FaTrash,
  FaSpinner,
  FaExclamationTriangle,
  FaRedo,
} from "react-icons/fa";

const API_URL = import.meta.env.VITE_API_URL as string;

interface Props {
  selectedModel: string | null;
  setSelectedModel: (model: string | null) => void;
  setAnalysisResult: (result: AnalysisResult | null) => void;
  onAnalysisComplete?: () => void;
}

export default function ResumeForm({
  selectedModel,
  setSelectedModel,
  setAnalysisResult,
  onAnalysisComplete,
}: Props) {
  const [resumeText, setResumeText] = useState("");
  const [jobPosting, setJobPosting] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<{
    message: string;
    suggestModelChange?: boolean;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf" || file.type.includes("word")) {
        setResumeFile(file);
      }
    }
  };

  const removeFile = () => {
    setResumeFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if ((!resumeFile && !resumeText) || !jobPosting) {
      alert("Please provide both resume and job posting information");
      return;
    }

    setLoading(true);
    setUploadProgress(0);
    setError(null);

    try {
      let response: Response;

      // Simulate upload progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          const newProgress = prev + (100 - prev) * 0.1;
          return newProgress > 95 ? 95 : newProgress;
        });
      }, 200);

      if (resumeFile) {
        const formData = new FormData();
        formData.append("resume", resumeFile);
        formData.append("job_posting", jobPosting);
        if (selectedModel) formData.append("model_id", selectedModel);

        response = await fetch(`${API_URL}/analyze/file`, {
          method: "POST",
          body: formData,
        });
      } else {
        response = await fetch(`${API_URL}/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resume_text: resumeText,
            job_posting: jobPosting,
            model_id: selectedModel,
          }),
        });
      }

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await response.json();
      
      if (!response.ok) {
        // Handle error with suggest_model_change flag
        if (data.detail && typeof data.detail === 'object') {
          setError({
            message: data.detail.message || "Analysis failed",
            suggestModelChange: !!data.detail.suggest_model_change
          });
          setAnalysisResult({ error: data.detail.message });
        } else {
          setError({
            message: "Analysis failed",
            suggestModelChange: false
          });
          setAnalysisResult({ error: "Failed to analyze resume" });
        }
        return;
      }
      
      setAnalysisResult(data);
      if (onAnalysisComplete) onAnalysisComplete();
    } catch (err) {
      console.error("Error analyzing resume", err);
      setError({
        message: "Failed to analyze resume",
        suggestModelChange: false
      });
      setAnalysisResult({ error: "Failed to analyze resume" });
    } finally {
      setLoading(false);
    }
  }

  const getFileIcon = () => {
    if (!resumeFile) return null;
    return resumeFile.name.endsWith(".pdf") ? (
      <FaFilePdf className="text-red-500 text-xl mr-2" />
    ) : (
      <FaFileWord className="text-blue-500 text-xl mr-2" />
    );
  };

  // Function to try a different model
  const handleTryDifferentModel = async () => {
    try {
      const res = await fetch(`${API_URL}/models`);
      const models = await res.json();
      
      // Get current model index
      const currentIndex = models.findIndex((m: ModelInfo) => m.id === selectedModel);
      
      // Select the next model or the first one if at the end
      if (currentIndex !== -1 && models.length > 0) {
        const nextIndex = (currentIndex + 1) % models.length;
        setSelectedModel(models[nextIndex].id);
        
        // Show message to the user
        setError({
          message: `Trying with ${models[nextIndex].name || models[nextIndex].id}...`,
          suggestModelChange: false
        });
        
        // Clear message after 2 seconds
        setTimeout(() => setError(null), 2000);
      }
    } catch (err) {
      console.error("Error fetching models", err);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 bg-white rounded-lg p-6 shadow-sm border border-gray-100"
    >
      <div className="border-b pb-4 mb-4">
        <h2 className="text-xl font-bold text-gray-800">Resume Analysis</h2>
        <p className="text-gray-600 text-sm mt-1">
          Upload your resume and job posting to get AI-powered match insights
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className={`rounded-lg p-4 flex items-start ${
          error.suggestModelChange ? "bg-amber-50 border border-amber-200" : "bg-red-50 border border-red-200"
        }`}>
          <FaExclamationTriangle className={`mt-0.5 mr-3 ${
            error.suggestModelChange ? "text-amber-500" : "text-red-500"
          }`} />
          <div className="flex-1">
            <p className={`text-sm ${
              error.suggestModelChange ? "text-amber-800" : "text-red-800"
            }`}>
              {error.message}
            </p>
            {error.suggestModelChange && (
              <div className="mt-3">
                <p className="text-amber-800 text-sm mb-2">
                  The current model may be experiencing issues. Please try with a different model.
                </p>
                <button
                  type="button"
                  onClick={handleTryDifferentModel}
                  className="flex items-center bg-amber-600 hover:bg-amber-700 text-white text-sm px-4 py-2 rounded"
                >
                  <FaRedo className="mr-2" /> Try Different Model
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Resume File Upload Area */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Resume File
        </label>

        {resumeFile ? (
          <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-100">
            <div className="flex items-center">
              {getFileIcon()}
              <span className="text-sm font-medium text-gray-800 truncate max-w-xs">
                {resumeFile.name}
              </span>
              <span className="text-xs text-gray-500 ml-2">
                ({(resumeFile.size / 1024).toFixed(1)} KB)
              </span>
            </div>
            <button
              type="button"
              onClick={removeFile}
              className="text-red-500 hover:text-red-700 p-1"
            >
              <FaTrash className="text-sm" />
            </button>
          </div>
        ) : (
          <div
            className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
              dragActive
                ? "border-blue-400 bg-blue-50"
                : "border-gray-300 hover:border-blue-400"
            }`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center justify-center cursor-pointer">
              <FaCloudUploadAlt className="text-blue-500 text-3xl mb-2" />
              <p className="text-sm text-gray-600 text-center">
                <span className="font-medium text-blue-600">Click to upload</span>{" "}
                or drag and drop
              </p>
              <p className="text-xs text-gray-500 mt-1">
                PDF or DOCX (max 10MB)
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
              className="hidden"
            />
          </div>
        )}

        <div className="flex items-center">
          <div className="h-px bg-gray-200 flex-grow"></div>
          <span className="px-3 text-sm text-gray-500">OR</span>
          <div className="h-px bg-gray-200 flex-grow"></div>
        </div>
      </div>

      {/* Resume Text */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Paste Resume Text
        </label>
        <textarea
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          placeholder="Copy and paste the content of your resume here..."
          disabled={!!resumeFile}
          className={`w-full border rounded-lg p-3 h-36 focus:ring-blue-500 focus:border-blue-500 ${
            resumeFile ? "bg-gray-100 text-gray-500" : ""
          }`}
        />
      </div>

      {/* Job Posting */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Job Description <span className="text-red-500">*</span>
        </label>
        <textarea
          value={jobPosting}
          onChange={(e) => setJobPosting(e.target.value)}
          placeholder="Paste the job description that you want to match against..."
          className="w-full border rounded-lg p-3 h-48 focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>

      {/* Submit button with loading state */}
      <div>
        <button
          type="submit"
          disabled={loading || (!resumeText && !resumeFile) || !jobPosting}
          className="w-full flex items-center justify-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {loading ? (
            <>
              <FaSpinner className="animate-spin mr-2" />
              Analyzing Resume...
            </>
          ) : (
            "Analyze Resume"
          )}
        </button>

        {loading && (
          <div className="mt-3">
            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-xs text-center mt-1 text-gray-500">
              Processing your resume...
            </p>
          </div>
        )}
      </div>
    </form>
  );
}
