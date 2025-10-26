import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Divider
} from '@mui/material';
import vpnDetectionService from '../services/vpn-detection.service';
import type { DetectionResult } from '../services/vpn-detection.service';

const IPDetector: React.FC = () => {
  const [ip, setIp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DetectionResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await vpnDetectionService.detectIP(ip);
      setResult(data);
      
      // Save to history in localStorage
      saveToHistory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const saveToHistory = (data: DetectionResult) => {
    try {
      const historyEntry = {
        ip: data.ip,
        verdict: data.verdict,
        score: data.score,
        threatLevel: data.threatLevel || 'UNKNOWN',
        timestamp: data.timestamp,
        cached: data.cached || false
      };

      // Get existing history
      const stored = localStorage.getItem('vpn_detection_history');
      let history = stored ? JSON.parse(stored) : [];

      // Add new entry at the beginning
      history.unshift(historyEntry);

      // Keep only the last 100 entries
      if (history.length > 100) {
        history = history.slice(0, 100);
      }

      // Save back to localStorage
      localStorage.setItem('vpn_detection_history', JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save to history:', error);
    }
  };

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto', mt: 3, p: 2, bgcolor: '#fafafa', minHeight: '100vh' }}>
      <Typography variant="h5" gutterBottom sx={{ color: '#555', borderBottom: '2px solid #ddd', pb: 1 }}>
        IP Detection
      </Typography>

      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label="Enter IP Address"
          value={ip}
          onChange={(e) => setIp(e.target.value)}
          margin="normal"
          variant="outlined"
          placeholder="e.g., 8.8.8.8"
        />
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          disabled={loading || !ip}
          sx={{ mt: 2 }}
        >
          {loading ? <CircularProgress size={24} /> : 'Detect'}
        </Button>
      </form>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {result && (
        <Card sx={{ mt: 3, border: '1px solid #ddd' }} elevation={0}>
          <CardContent sx={{ bgcolor: '#f9f9f9' }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h5" gutterBottom>
                Detection Results
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Verdict
                </Typography>
                <Chip
                  label={result.verdict}
                  color={result.verdict === 'PROXY/VPN' ? 'error' : 'success'}
                  sx={{ mt: 1, fontWeight: 'bold' }}
                />
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Threat Score
                </Typography>
                <Typography variant="h4" color={result.score > 50 ? 'error.main' : 'success.main'}>
                  {result.score}/100
                </Typography>
              </Box>
            </Box>
            
            {result.threatLevel && (
              <Box sx={{ mb: 2 }}>
                <Chip
                  label={`Threat Level: ${result.threatLevel}`}
                  color={result.threatLevel === 'HIGH' ? 'error' : result.threatLevel === 'MEDIUM' ? 'warning' : 'info'}
                />
              </Box>
            )}

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              Detection Checks
            </Typography>
            {result.checks.map((check, index) => (
              <Box key={index} sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>{check.result ? '✓' : '✗'}</span>
                  <strong>{check.type}</strong>
                  {check.score && <Chip label={`Score: ${check.score}`} size="small" />}
                </Typography>
                {check.details && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {check.details}
                  </Typography>
                )}
                {check.provider && (
                  <Chip label={check.provider} size="small" sx={{ mt: 1 }} />
                )}
              </Box>
            ))}

            {result.analysis && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Analysis Summary
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {result.analysis.isVPN && <Chip label="VPN Detected" color="warning" />}
                  {result.analysis.isProxy && <Chip label="Proxy Detected" color="warning" />}
                  {result.analysis.isTor && <Chip label="Tor Network" color="error" />}
                  {result.analysis.isHosting && <Chip label="Hosting/Datacenter" color="info" />}
                </Box>
              </Box>
            )}

            {result.whois && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  WHOIS Information
                </Typography>
                <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 1, overflow: 'auto' }}>
                  <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                    {JSON.stringify(result.whois, null, 2)}
                  </pre>
                </Box>
              </Box>
            )}

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
              Analyzed at: {new Date(result.timestamp).toLocaleString()}
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default IPDetector;