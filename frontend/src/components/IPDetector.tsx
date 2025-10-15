import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert
} from '@mui/material';
import axios from 'axios';

interface DetectionResult {
  ip: string;
  verdict: 'PROXY/VPN' | 'ORIGINAL';
  score: number;
  whois: Record<string, any>;
  checks: Array<{
    type: string;
    result: boolean;
    details?: string;
  }>;
}

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
      const response = await axios.post('http://localhost:5000/api/detect', { ip });
      setResult(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4, p: 2 }}>
      <Typography variant="h4" gutterBottom>
        VPN & Proxy Detector
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
        <Card sx={{ mt: 4 }}>
          <CardContent>
            <Typography variant="h6" color={result.verdict === 'PROXY/VPN' ? 'error' : 'success'}>
              Verdict: {result.verdict}
            </Typography>
            <Typography variant="body1" sx={{ mt: 2 }}>
              Trust Score: {result.score}/100
            </Typography>
            {result.checks.map((check, index) => (
              <Box key={index} sx={{ mt: 2 }}>
                <Typography variant="subtitle2">
                  {check.type}: {check.result ? '✓' : '✗'}
                </Typography>
                {check.details && (
                  <Typography variant="body2" color="text.secondary">
                    {check.details}
                  </Typography>
                )}
              </Box>
            ))}
            {result.whois && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6">WHOIS Information</Typography>
                <pre style={{ whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(result.whois, null, 2)}
                </pre>
              </Box>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default IPDetector;