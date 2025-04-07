import { useState, useEffect } from "react";
import axios from "axios";
import './App.css';

const baseURL = import.meta.env.VITE_API_URL;

function App() {
  const [repoUrl, setRepoUrl] = useState("");
  const [jobId, setJobId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [jobStatus, setJobStatus] = useState(null);

  const isScanning = loading || (jobStatus && jobStatus.status === "analyzing");

  const handleStartScan = async () => {
    if (!repoUrl.trim()) {
      setError("Please enter a GitHub URL.");
      return;
    }

    setError("");
    setLoading(true);
    setJobId("");
    setJobStatus(null);

    try {
      const res = await axios.post(`${baseURL}/start-job`, {
        repo_url: repoUrl,
      });
      setJobId(res.data.job_id);
    } catch (err) {
      setError("Failed to start scan. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setRepoUrl("");
    setJobId("");
    setJobStatus(null);
    setLoading(false);
    setError("");
  };

  useEffect(() => {
    if (!jobId) return;

    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${baseURL}/job-status/${jobId}`);
        setJobStatus(res.data);
        const status = res.data.status;
        const result = res.data.result;

        if ((status === "done" && result?.pdf_filename) || status === "error") {
          clearInterval(interval);
        }
      } catch (err) {
        console.error("Polling error", err);
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [jobId]);

  return (
    <div className="app-container">
      <div className="glass-box">
        <h1 className="title">CodexAudit <span role="img">🔍</span></h1>

        <input
          type="text"
          placeholder="Enter GitHub repo URL"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          className="input"
          disabled={isScanning}
        />

        <button
          onClick={handleStartScan}
          disabled={isScanning}
          className="button"
        >
          {jobStatus?.status === "done"
            ? "Scan Done ✅"
            : isScanning
            ? "Scanning..."
            : "Scan Now"}
        </button>

        {error && <p className="error">{error}</p>}

        {jobId && (
          <div className="status">
            <p>🛠 <strong>Job:</strong> <code>{jobId}</code></p>
            {jobStatus ? (
              <div className="details">
                {jobStatus.started_at && <p>🕒 <strong>Started:</strong> {jobStatus.started_at}</p>}
                {typeof jobStatus.chunks_done === "number" && typeof jobStatus.total_chunks === "number" && (
                  <p>📦 <strong>Chunks:</strong> {jobStatus.chunks_done}/{jobStatus.total_chunks}</p>
                )}
                <p>⏳ <strong>Status:</strong> {jobStatus.status || "Loading..."}</p>
              </div>
            ) : <p>Loading job status...</p>}
          </div>
        )}

        {jobStatus?.status === "done" && jobStatus.result && (
          <div className="result">
            <p className="success">✅ Scan complete. {jobStatus.result.total_issues} issues found.</p>
            <div className="action-buttons">
              <a
                href={`${baseURL}/download-report/${jobStatus.result.pdf_filename}`}
                className="download"
                download
              >
                📥 Download PDF Report
              </a>
              <button onClick={handleReset} className="download">
                🔁 Scan Another Repo
              </button>
            </div>
          </div>
        )}

        {jobStatus?.status === "error" && (
          <p className="error">❌ {jobStatus.error}</p>
        )}
      </div>
    </div>
  );
}

export default App;
