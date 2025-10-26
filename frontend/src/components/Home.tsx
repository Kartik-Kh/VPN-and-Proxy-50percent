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
} from '@mui/material';
import axios from 'axios';

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
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to analyze IP address');
    } finally {
      setLoading(false);
    }
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
                        p: 2,
                        border: '1px solid #ddd',
                        background: '#fff',
                      }}
                    >
                      <Typography
                        variant="body1"
                        sx={{ 
                          fontWeight: 500,
                          color: '#555',
                          mb: 1
                        }}
                      >
                        Result: {result.verdict === 'PROXY/VPN' ? 'VPN/Proxy' : 'Clean'}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#666' }}>
                        Score: {result.score}/100
                      </Typography>

                      <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #eee' }}>
                        <Typography variant="caption" sx={{ display: 'block', color: '#666', mb: 0.5 }}>
                          IP: {result.ip || ipAddress}
                        </Typography>
                        
                        {result.whois?.parsed?.organization && (
                          <Typography variant="caption" sx={{ display: 'block', color: '#666' }}>
                            Network: {result.whois.parsed.organization}
                          </Typography>
                        )}
                        
                        {result.checks && result.checks.length > 0 && (
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="caption" sx={{ display: 'block', color: '#999', fontSize: '0.7rem' }}>
                              {result.checks.length} checks performed
                            </Typography>
                          </Box>
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