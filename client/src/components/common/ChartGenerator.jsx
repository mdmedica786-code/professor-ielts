import { useState, useRef, useCallback, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  RadialLinearScale,
  Filler,
  Tooltip,
  Legend,
  Title,
} from 'chart.js';
import { Bar, Line, Pie, Doughnut, Radar, PolarArea } from 'react-chartjs-2';
import {
  validateChartData,
  chartDataToChartJS,
  SAMPLE_CHARTS,
  CHART_TYPES,
} from '../../utils/chartUtils';
import {
  BarChart3,
  Upload,
  Download,
  Copy,
  Check,
  AlertCircle,
  FileJson,
  Sparkles,
  ChevronDown,
  X,
} from 'lucide-react';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  RadialLinearScale,
  Filler,
  Tooltip,
  Legend,
  Title
);

const CHART_COMPONENTS = {
  bar: Bar,
  line: Line,
  pie: Pie,
  doughnut: Doughnut,
  radar: Radar,
  polarArea: PolarArea,
};

const TYPE_LABELS = {
  bar: '📊 Bar Chart',
  line: '📈 Line Chart',
  pie: '🥧 Pie Chart',
  doughnut: '🍩 Doughnut',
  radar: '🕸️ Radar',
  polarArea: '🎯 Polar Area',
};

export default function ChartGenerator() {
  const [jsonInput, setJsonInput] = useState('');
  const [chartData, setChartData] = useState(null);
  const [errors, setErrors] = useState([]);
  const [copied, setCopied] = useState(false);
  const [showSamples, setShowSamples] = useState(false);

  const chartRef = useRef(null);
  const fileInputRef = useRef(null);

  // Parse and validate JSON
  const handleGenerate = useCallback(() => {
    setErrors([]);
    setChartData(null);

    if (!jsonInput.trim()) {
      setErrors(['Please enter or paste JSON data.']);
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonInput);
    } catch (e) {
      setErrors([`Invalid JSON: ${e.message}`]);
      return;
    }

    const validation = validateChartData(parsed);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setChartData(parsed);
  }, [jsonInput]);

  // Load a sample
  const loadSample = useCallback((type) => {
    const sample = SAMPLE_CHARTS[type];
    setJsonInput(JSON.stringify(sample, null, 2));
    setErrors([]);
    setChartData(sample);
    setShowSamples(false);
  }, []);

  // Upload JSON file
  const handleFileUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = '';

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      setJsonInput(text);
      // Auto-parse
      try {
        const parsed = JSON.parse(text);
        const validation = validateChartData(parsed);
        if (validation.valid) {
          setChartData(parsed);
          setErrors([]);
        } else {
          setErrors(validation.errors);
          setChartData(null);
        }
      } catch (err) {
        setErrors([`Invalid JSON in file: ${err.message}`]);
        setChartData(null);
      }
    };
    reader.readAsText(file);
  }, []);

  // Download chart as PNG
  const downloadPNG = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const url = chart.toBase64Image();
    const link = document.createElement('a');
    link.download = `chart-${chartData?.type || 'graph'}-${Date.now()}.png`;
    link.href = url;
    link.click();
  }, [chartData]);

  // Copy JSON to clipboard
  const copyJSON = useCallback(() => {
    if (!jsonInput) return;
    navigator.clipboard.writeText(jsonInput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [jsonInput]);

  // Build Chart.js config
  const chartConfig = useMemo(() => {
    if (!chartData) return null;
    return chartDataToChartJS(chartData);
  }, [chartData]);

  const ChartComponent = chartData ? CHART_COMPONENTS[chartData.type] : null;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-50 text-brand-700 rounded-full text-xs font-semibold">
          <BarChart3 className="w-3.5 h-3.5" />
          Chart Generator
        </div>
        <h1 className="text-2xl font-bold text-slate-900">
          Generate Charts from JSON Data
        </h1>
        <p className="text-sm text-slate-500 max-w-lg mx-auto">
          Paste your data as JSON or load a sample template. Supports bar, line, pie, doughnut, radar, and polar area charts.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: JSON Input */}
        <div className="space-y-4">
          <div className="card-padded">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <FileJson className="w-3.5 h-3.5 text-slate-400" />
                JSON Data
              </label>
              <div className="flex items-center gap-1.5">
                {/* Upload file */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-ghost text-xs flex items-center gap-1 px-2 py-1"
                  title="Upload .json file"
                >
                  <Upload className="w-3 h-3" /> Upload
                </button>
                {/* Copy */}
                <button
                  onClick={copyJSON}
                  disabled={!jsonInput}
                  className="btn-ghost text-xs flex items-center gap-1 px-2 py-1 disabled:opacity-40"
                  title="Copy JSON"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                {/* Clear */}
                {jsonInput && (
                  <button
                    onClick={() => { setJsonInput(''); setChartData(null); setErrors([]); }}
                    className="btn-ghost text-xs flex items-center gap-1 px-2 py-1 text-rose-500 hover:text-rose-700"
                  >
                    <X className="w-3 h-3" /> Clear
                  </button>
                )}
              </div>
            </div>

            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder={`{\n  "type": "bar",\n  "title": "My Chart",\n  "labels": ["A", "B", "C"],\n  "datasets": [\n    {\n      "label": "Series 1",\n      "data": [10, 20, 30]\n    }\n  ]\n}`}
              rows={16}
              className="textarea-field font-mono text-xs leading-relaxed"
              spellCheck={false}
            />

            {/* Errors */}
            {errors.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {errors.map((err, i) => (
                  <div key={i} className="flex items-start gap-2 bg-rose-50 text-rose-700 text-xs px-3 py-2 rounded-xl">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>{err}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={handleGenerate}
                className="btn-primary flex items-center gap-2 px-4 py-2.5 text-sm"
              >
                <Sparkles className="w-4 h-4" />
                Generate Chart
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowSamples(!showSamples)}
                  className="btn-ghost flex items-center gap-1.5 px-3 py-2.5 text-sm"
                >
                  Load Sample
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSamples ? 'rotate-180' : ''}`} />
                </button>

                {showSamples && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-10 py-1.5 w-48">
                    {CHART_TYPES.map((type) => (
                      <button
                        key={type}
                        onClick={() => loadSample(type)}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-brand-50 hover:text-brand-700 transition-colors"
                      >
                        {TYPE_LABELS[type]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* JSON Schema Guide */}
          <div className="card-padded bg-slate-50">
            <h3 className="text-xs font-semibold text-slate-700 mb-2">📋 JSON Schema</h3>
            <div className="text-[11px] text-slate-600 space-y-1 font-mono">
              <p><span className="text-brand-600">type</span>: "bar" | "line" | "pie" | "doughnut" | "radar" | "polarArea"</p>
              <p><span className="text-brand-600">title</span>: string (optional)</p>
              <p><span className="text-brand-600">labels</span>: ["Label1", "Label2", ...]</p>
              <p><span className="text-brand-600">datasets</span>: [{'{'} label, data, color? {'}'}]</p>
            </div>
          </div>
        </div>

        {/* Right: Chart Preview */}
        <div className="space-y-4">
          <div className="card-padded min-h-[400px] flex flex-col">
            {chartConfig && ChartComponent ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-700">
                    {TYPE_LABELS[chartData.type]} Preview
                  </span>
                  <button
                    onClick={downloadPNG}
                    className="btn-ghost flex items-center gap-1.5 text-xs px-2.5 py-1.5 text-brand-600 hover:text-brand-700"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download PNG
                  </button>
                </div>
                <div className="flex-1 flex items-center justify-center p-4 bg-white rounded-xl border border-slate-100">
                  <ChartComponent
                    ref={chartRef}
                    data={chartConfig.data}
                    options={chartConfig.options}
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                <BarChart3 className="w-12 h-12 text-slate-200 mb-4" />
                <p className="text-sm font-medium text-slate-400">
                  Your chart will appear here
                </p>
                <p className="text-xs text-slate-300 mt-1">
                  Enter JSON data and click "Generate Chart"
                </p>
                <button
                  onClick={() => loadSample('bar')}
                  className="mt-4 text-xs text-brand-600 hover:text-brand-700 font-medium underline underline-offset-2"
                >
                  Try a sample →
                </button>
              </div>
            )}
          </div>

          {/* Stats when chart is rendered */}
          {chartData && (
            <div className="grid grid-cols-3 gap-3">
              <div className="card-padded text-center py-3">
                <p className="text-lg font-bold text-slate-800">{chartData.labels?.length || 0}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Data Points</p>
              </div>
              <div className="card-padded text-center py-3">
                <p className="text-lg font-bold text-slate-800">{chartData.datasets?.length || 0}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Datasets</p>
              </div>
              <div className="card-padded text-center py-3">
                <p className="text-lg font-bold text-brand-600 capitalize">{chartData.type}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Type</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
