import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import { CloudUpload, Assessment } from '@mui/icons-material';
import axios from 'axios';

interface BulkResult {
  ip: string;
  verdict: string;
  score: number;
  threatLevel: string;
}

interface BulkResponse {
  total: number;
  processed: number;
  results: BulkResult[];
  summary: {
    clean: number;
    suspicious: number;
    vpn: number;
  };
}

const BulkAnalysis = () => {
  const [ipList, setIpList] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BulkResponse | null>(null);
  const [error, setError] = useState('');

  const handleAnalyze = async () => {
    setError('');
    setResults(null);

    const ips = ipList
      .split('\\n')
      .map(ip => ip.trim())
      .filter(ip => ip.length > 0);

    if (ips.length === 0) {
      setError('Please enter at least one IP address');
      return;
    }

    if (ips.length > 100) {
      setError('Maximum 100 IPs allowed at once');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post<BulkResponse>(
        `${import.meta.env.VITE_API_URL}/detect/bulk`,
        { ips }
      );
      setResults(response.data);
      
      // Save results to history
      saveResultsToHistory(response.data.results);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Bulk analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const saveResultsToHistory = (bulkResults: BulkResult[]) => {
    try {
      const historyEntries = bulkResults.map(result => ({
        ip: result.ip,
        verdict: result.verdict,
        score: result.score,
        threatLevel: result.threatLevel || 'UNKNOWN',
        timestamp: new Date().toISOString(),
        cached: false
      }));

      // Get existing history
      const stored = localStorage.getItem('vpn_detection_history');
      let history = stored ? JSON.parse(stored) : [];

      // Add new entries at the beginning
      history.unshift(...historyEntries);

      // Keep only the last 100 entries
      if (history.length > 100) {
        history = history.slice(0, 100);
      }

      // Save back to localStorage
      localStorage.setItem('vpn_detection_history', JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save bulk results to history:', error);
    }
  };

  const getVerdictColor = (verdict: string) => {
    switch (verdict.toUpperCase()) {
      case 'ORIGINAL':
        return 'success';
      case 'PROXY/VPN':
        return 'error';
      case 'ERROR':
        return 'default';
      default:
        return 'warning';
    }
  };

  const getThreatColor = (level: string) => {
    switch (level?.toUpperCase()) {
      case 'CLEAN':
        return 'success';
      case 'LOW':
        return 'info';
      case 'MEDIUM':
        return 'warning';
      case 'HIGH':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Assessment /> Bulk IP Analysis
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Analyze multiple IP addresses at once. Enter one IP per line (max 100 IPs).
        </Typography>

        <TextField
          fullWidth
          multiline
          rows={8}
          label="IP Addresses (one per line)"
          value={ipList}
          onChange={(e) => setIpList(e.target.value)}
          placeholder="8.8.8.8
1.1.1.1
192.168.1.1"
          sx={{ mb: 2 }}
          disabled={loading}
        />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Button
          variant="contained"
          size="large"
          startIcon={loading ? <CircularProgress size={20} /> : <CloudUpload />}
          onClick={handleAnalyze}
          disabled={loading || !ipList.trim()}
        >
          {loading ? 'Analyzing...' : 'Analyze IPs'}
        </Button>
      </Paper>

      {results && (
        <>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Summary
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Chip
                label={`Total: ${results.total}`}
                color="primary"
                sx={{ fontSize: '1rem', py: 2.5, px: 1 }}
              />
              <Chip
                label={`Clean: ${results.summary.clean}`}
                color="success"
                sx={{ fontSize: '1rem', py: 2.5, px: 1 }}
              />
              <Chip
                label={`Suspicious: ${results.summary.suspicious}`}
                color="warning"
                sx={{ fontSize: '1rem', py: 2.5, px: 1 }}
              />
              <Chip
                label={`VPN/Proxy: ${results.summary.vpn}`}
                color="error"
                sx={{ fontSize: '1rem', py: 2.5, px: 1 }}
              />
            </Box>
          </Paper>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>IP Address</strong></TableCell>
                  <TableCell><strong>Verdict</strong></TableCell>
                  <TableCell><strong>Score</strong></TableCell>
                  <TableCell><strong>Threat Level</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {results.results.map((result, index) => (
                  <TableRow key={index}>
                    <TableCell>{result.ip}</TableCell>
                    <TableCell>
                      <Chip
                        label={result.verdict}
                        color={getVerdictColor(result.verdict)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <strong>{result.score}/100</strong>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={result.threatLevel}
                        color={getThreatColor(result.threatLevel)}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {!results && !loading && (
        <Paper sx={{ p: 4, textAlign: 'center', bgcolor: '#f5f5f5' }}>
          <Typography variant="body1" color="text.secondary">
            Enter IP addresses above and click "Analyze IPs" to get started
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default BulkAnalysis;
