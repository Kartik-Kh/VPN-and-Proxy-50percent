import { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Container,
  Alert,
  CircularProgress,
  Paper,
  Chip,
} from '@mui/material';
import axios from 'axios';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const Home = () => {
  const [ipAddress, setIpAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const handleAnalyze = async () => {
    if (!ipAddress) return;
    
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/detect/single`, { 
        ip: ipAddress 
      });

      setResult(response.data);
      
      // Save to history
      saveToHistory(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to analyze IP address');
    } finally {
      setLoading(false);
    }
  };

  const saveToHistory = (data: any) => {
    try {
      const historyEntry = {
        ip: data.ip || ipAddress,
        verdict: data.verdict,
        score: data.score,
        threatLevel: data.threatLevel || 'UNKNOWN',
        timestamp: data.timestamp || new Date().toISOString(),
        cached: data.cached || false
      };

      const stored = localStorage.getItem('vpn_detection_history');
      let history = stored ? JSON.parse(stored) : [];
      
      history.unshift(historyEntry);
      
      if (history.length > 100) {
        history = history.slice(0, 100);
      }
      
      localStorage.setItem('vpn_detection_history', JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save to history:', error);
    }
  };

  const getChartData = () => {
    const score = result?.score || 0;
    const trustScore = 100 - score; // Inverted: higher trust = lower threat
    
    return {
      labels: ['Trust Score', 'Threat Score'],
      datasets: [
        {
          data: [trustScore, score],
          backgroundColor: [
            score < 30 ? '#4caf50' : score < 70 ? '#ff9800' : '#f44336',
            '#e0e0e0',
          ],
          borderWidth: 0,
        },
      ],
    };
  };

  const chartOptions = {
    cutout: '75%',
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
      },
    },
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: '#fafafa',
        padding: 3,
        pt: 12
      }}
    >
      <Container maxWidth="md">
        <Box textAlign="center" mb={3}>
          <Typography
            variant="h4"
            gutterBottom
            sx={{
              color: '#555',
              fontWeight: 400,
            }}
          >
            IP Detection
          </Typography>
          
          <Typography
            variant="body2"
            sx={{
              color: '#999',
              fontSize: '0.85rem'
            }}
          >
            Basic IP analysis
          </Typography>
        </Box>
        <Paper
          elevation={0}
          sx={{
            maxWidth: 500,
            margin: 'auto',
            mb: 3,
            border: '1px solid #ddd',
            p: 3
          }}
        >
                <Typography 
                  variant="body1" 
                  gutterBottom
                  sx={{
                    color: '#666',
                    fontWeight: 500,
                    mb: 2
                  }}
                >
                  Enter IP Address
                </Typography>
                <Box
                  component="form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAnalyze();
                  }}
                  sx={{
                    display: 'flex',
                    gap: 2,
                    flexDirection: { xs: 'column', sm: 'row' },
                  }}
                >
                  <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="e.g., 8.8.8.8"
                    value={ipAddress}
                    onChange={(e) => setIpAddress(e.target.value)}
                    size="small"
                  />
                  <Button
                    variant="contained"
                    size="small"
                    type="submit"
                    disabled={loading || !ipAddress}
                    sx={{
                      minWidth: '120px',
                      textTransform: 'none',
                      bgcolor: '#1976d2'
                    }}
                  >
                    {loading ? <CircularProgress size={18} color="inherit" /> : 'Check IP'}
                  </Button>
                </Box>
                {error && (
                  <Alert 
                    severity="error" 
                    sx={{ 
                      mt: 2,
                      borderRadius: 2,
                    }}
                  >
                    {error}
                  </Alert>
                )}
                {result && (
                  <Box sx={{ mt: 3 }}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 3,
                        border: '1px solid #ddd',
                        background: '#fff',
                      }}
                    >
                      {/* Trust Score Gauge */}
                      <Box sx={{ position: 'relative', width: 200, height: 200, margin: 'auto', mb: 2 }}>
                        <Doughnut data={getChartData()} options={chartOptions} />
                        <Box
                          sx={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            textAlign: 'center',
                          }}
                        >
                          <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#333' }}>
                            {100 - result.score}%
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#666' }}>
                            Trust Score
                          </Typography>
                        </Box>
                      </Box>

                      {/* Verdict Badge */}
                      <Box sx={{ textAlign: 'center', mb: 2 }}>
                        <Chip
                          label={result.verdict === 'PROXY/VPN' ? 'VPN/Proxy Detected' : 'Clean IP'}
                          color={result.verdict === 'PROXY/VPN' ? 'error' : 'success'}
                          sx={{ fontSize: '0.9rem', px: 2, py: 2.5 }}
                        />
                      </Box>

                      {/* Threat Score */}
                      <Box sx={{ textAlign: 'center', mb: 2 }}>
                        <Typography variant="body2" sx={{ color: '#666' }}>
                          Threat Score: <strong>{result.score}/100</strong>
                        </Typography>
                        {result.threatLevel && (
                          <Chip
                            label={`${result.threatLevel} Risk`}
                            size="small"
                            color={
                              result.threatLevel === 'HIGH' ? 'error' :
                              result.threatLevel === 'MEDIUM' ? 'warning' :
                              result.threatLevel === 'LOW' ? 'info' : 'success'
                            }
                            sx={{ mt: 1 }}
                          />
                        )}
                      </Box>

                      {/* IP Details */}
                      <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #eee' }}>
                        <Typography variant="caption" sx={{ display: 'block', color: '#666', mb: 0.5 }}>
                          IP: <strong>{result.ip || ipAddress}</strong>
                        </Typography>
                        
                        {result.whois?.parsed?.organization && (
                          <Typography variant="caption" sx={{ display: 'block', color: '#666', mb: 0.5 }}>
                            Network: {result.whois.parsed.organization}
                          </Typography>
                        )}
                        
                        {result.checks && result.checks.length > 0 && (
                          <Typography variant="caption" sx={{ display: 'block', color: '#999', fontSize: '0.7rem' }}>
                            {result.checks.length} security checks performed
                          </Typography>
                        )}

                        {result.cached && (
                          <Chip
                            label="⚡ Cached Result"
                            size="small"
                            variant="outlined"
                            sx={{ mt: 1 }}
                          />
                        )}
                      </Box>
                    </Paper>
                  </Box>
                )}
              </Paper>
            
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: '#aaa' }}>
            Work in progress
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Home;