import { useEffect, useState } from "react";
import { FaRobot, FaInfoCircle, FaSpinner } from "react-icons/fa";
import { Tooltip } from "react-tooltip";

const API_URL = import.meta.env.VITE_API_URL as string;

interface PricingInfo {
  prompt?: string;
  completion?: string;
  request?: string;
  image?: string;
  web_search?: string;
  internal_reasoning?: string;
  input_cache_read?: string;
  input_cache_write?: string;
}

export interface ModelInfo {
  id: string;
  name?: string;
  description?: string;
  context_length?: number;
  pricing?: PricingInfo;
}

interface Props {
  selectedModel: string | null;
  setSelectedModel: (model: string | null) => void;
}

export default function ModelSelector({ selectedModel, setSelectedModel }: Props) {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Function to determine if a model is free based on keywords
  const isModelFree = (model: ModelInfo): boolean => {
    // Check for free indicators in model name or ID
    const nameIndicators = model.name?.toLowerCase() || '';
    const idIndicators = model.id.toLowerCase();
    
    // Look for explicit free indicators
    const freeKeywords = ['free', 'basic', 'standard'];
    
    // Check if any free keywords are in the name or ID
    const hasKeywordInName = freeKeywords.some(keyword => 
      nameIndicators.includes(`(${keyword})`) || 
      nameIndicators.includes(`${keyword}`) ||
      idIndicators.includes(`${keyword}`)
    );
    
    if (hasKeywordInName) return true;
    
    // If model has pricing info, check if explicitly marked as free
    if (model.pricing) {
      const allPriceValues = Object.values(model.pricing).filter(Boolean);
      
      // If no pricing values, consider it free
      if (allPriceValues.length === 0) return true;
      
      // Check for $0 or "Free" in pricing values
      return allPriceValues.some(value => 
        value === "0" || 
        value === "$0" || 
        value === "0.0" ||
        typeof value === 'string' && value.toLowerCase().includes('free')
      );
    }
    
    // If model has description mentioning free, consider it free
    if (model.description?.toLowerCase().includes('free')) {
      return true;
    }
    
    // Default to considering base/foundational models as free
    return model.id.toLowerCase().includes('base') || 
           model.id.toLowerCase().includes('foundation');
  };

  useEffect(() => {
    async function fetchModels() {
      try {
        const res = await fetch(`${API_URL}/models`);
        const data = await res.json();
        setModels(data);

        // Find the first free model and select it by default
        if (!selectedModel && data.length > 0) {
          const freeModels = data.filter(isModelFree);
          if (freeModels.length > 0) {
            setSelectedModel(freeModels[0].id);
          } else {
            // If no free models are found, select the first available model
            setSelectedModel(data[0].id);
          }
        }
      } catch (err) {
        console.error("Error fetching models", err);
      } finally {
        setLoading(false);
      }
    }
    fetchModels();
  }, [selectedModel, setSelectedModel]);

  const selected = selectedModel
    ? models.find((m) => m.id === selectedModel)
    : null;

  // Get free models for display purposes
  const freeModels = models.filter(isModelFree);

  return (
    <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
      <div className="flex items-center space-x-2 mb-4">
        <FaRobot className="text-blue-600 text-xl" />
        <h2 className="text-lg font-semibold">Select AI Model</h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 text-gray-500">
          <FaSpinner className="animate-spin mr-2" />
          <span>Loading models...</span>
        </div>
      ) : (
        <>
          <div className="relative">
            <select
              value={selectedModel || ""}
              onChange={(e) =>
                setSelectedModel(e.target.value ? e.target.value : null)
              }
              className="w-full border border-gray-300 rounded-lg p-3 pr-10 appearance-none bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name || m.id} {isModelFree(m) ? "(Free)" : ""}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>

          {/* Free models indication */}
          {freeModels.length > 0 && (
            <div className="mt-2 text-xs text-green-600 flex items-center">
              <FaInfoCircle className="mr-1" />
              {freeModels.length === 1
                ? "1 free model available"
                : `${freeModels.length} free models available`}
            </div>
          )}

          {selected?.description && (
            <div className="mt-2 text-sm text-gray-600 italic">
              {selected.description}
            </div>
          )}

          {/* Model info card */}
          {selected && (
            <div className="mt-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-blue-800">
                  {selected.name || selected.id}
                </span>
                {selected.context_length && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    Context: {selected.context_length.toLocaleString()} tokens
                  </span>
                )}
              </div>

              {/* Pricing info */}
              {selected.pricing &&
                Object.keys(selected.pricing).some(
                  (key) => selected.pricing?.[key as keyof PricingInfo]
                ) && (
                  <div className="mt-3">
                    <div className="flex items-center text-xs text-blue-700 font-medium mb-1">
                      <FaInfoCircle className="mr-1" />
                      <span>Pricing Information</span>
                      <span
                        className="ml-1 cursor-help"
                        data-tooltip-id="pricing-tooltip"
                        data-tooltip-content="Costs may vary based on token usage"
                      >
                        <FaInfoCircle />
                      </span>
                      <Tooltip id="pricing-tooltip" place="top" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {Object.entries(selected.pricing).map(([key, value]) =>
                        value ? (
                          <div key={key} className="flex justify-between">
                            <span className="text-gray-600 capitalize">
                              {key.replace(/_/g, " ")}:
                            </span>
                            <span className="text-blue-800 font-medium">
                              {value}
                            </span>
                          </div>
                        ) : null
                      )}
                    </div>
                  </div>
                )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
