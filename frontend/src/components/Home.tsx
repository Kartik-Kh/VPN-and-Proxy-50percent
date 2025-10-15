import { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Container,
  Alert,
  CircularProgress,
  Paper,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
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
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box textAlign="center" mb={6}>
          <Typography
            variant="h2"
            gutterBottom
            sx={{
              color: '#ffffff',
              fontWeight: 700,
              mb: 2,
            }}
          >
            Proxy & VPN Detector
          </Typography>
          
          <Typography
            variant="h5"
            sx={{
              color: '#ffffff',
              fontWeight: 600,
              mb: 1,
              textShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
          >
            Security & Bureau of Cyber Offenders
          </Typography>
          
          <Typography
            variant="h6"
            sx={{
              color: 'rgba(255, 255, 255, 0.9)',
              fontWeight: 400,
            }}
          >
            Law Enforcement Surveillance Solution - Detect Masked IPs & WHOIS Intelligence
          </Typography>
        </Box>

        <Card
          elevation={6}
          sx={{
            maxWidth: 600,
            margin: 'auto',
            mb: 6,
            borderRadius: 3,
            background: '#ffffff',
          }}
        >
              <CardContent sx={{ p: 4 }}>
                <Typography 
                  variant="h5" 
                  gutterBottom
                  sx={{
                    color: '#667eea',
                    fontWeight: 600,
                    mb: 3
                  }}
                >
                  IP Address Analysis (IPv4/IPv6)
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
                    placeholder="Enter IPv4/IPv6 address or domain (e.g., 8.8.8.8)"
                    value={ipAddress}
                    onChange={(e) => setIpAddress(e.target.value)}
                    sx={{
                      flex: 1,
                      '& .MuiOutlinedInput-root': {
                        '&:hover fieldset': {
                          borderColor: '#667eea',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#667eea',
                        },
                      },
                    }}
                  />
                  <Button
                    variant="contained"
                    size="large"
                    type="submit"
                    disabled={loading || !ipAddress}
                    sx={{
                      minWidth: { sm: '160px' },
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      fontWeight: 600,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontSize: '1rem',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                      },
                      '&.Mui-disabled': {
                        background: '#e0e0e0',
                      }
                    }}
                    startIcon={!loading && <SearchIcon />}
                  >
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Analyze'}
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
                      elevation={3}
                      sx={{
                        p: 3,
                        borderRadius: 3,
                        background: result.verdict === 'PROXY/VPN' 
                          ? 'linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%)'
                          : 'linear-gradient(135deg, #81ecec 0%, #74b9ff 100%)',
                      }}
                    >
                      <Box sx={{ textAlign: 'center', mb: 2 }}>
                        <Typography
                          variant="h4"
                          sx={{ 
                            fontWeight: 700,
                            color: result.verdict === 'PROXY/VPN' ? '#d63031' : '#0984e3',
                            mb: 1
                          }}
                        >
                          {result.verdict === 'PROXY/VPN' ? '⚠️ VPN/Proxy Detected' : '✅ Clean IP'}
                        </Typography>
                        <Typography variant="h6" sx={{ color: '#2d3436' }}>
                          Risk Score: <strong>{result.score}/100</strong>
                        </Typography>
                      </Box>

                      <Box sx={{ 
                        bgcolor: 'rgba(255, 255, 255, 0.9)',
                        p: 2,
                        borderRadius: 2,
                        mt: 2
                      }}>
                        <Typography variant="body1" sx={{ mb: 1 }}>
                          <strong>IP Address:</strong> {result.ip || ipAddress}
                        </Typography>
                        
                        {result.threatLevel && (
                          <Typography variant="body1" sx={{ mb: 1 }}>
                            <strong>Threat Level:</strong> <span style={{ 
                              color: result.threatLevel === 'HIGH' ? '#d63031' : 
                                     result.threatLevel === 'MEDIUM' ? '#e17055' : 
                                     result.threatLevel === 'LOW' ? '#fdcb6e' : '#00b894'
                            }}>{result.threatLevel}</span>
                          </Typography>
                        )}
                        
                        {result.whois?.parsed && (
                          <Box sx={{ mt: 2, p: 2, bgcolor: '#f8f9fa', borderRadius: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#2d3436' }}>
                              📋 WHOIS Records:
                            </Typography>
                            {result.whois.parsed.organization && (
                              <Typography variant="body2" sx={{ ml: 1, color: '#2d3436' }}>
                                <strong>Organization:</strong> {result.whois.parsed.organization}
                              </Typography>
                            )}
                            {result.whois.parsed.netname && (
                              <Typography variant="body2" sx={{ ml: 1, color: '#2d3436' }}>
                                <strong>Network:</strong> {result.whois.parsed.netname}
                              </Typography>
                            )}
                            {result.whois.parsed.country && (
                              <Typography variant="body2" sx={{ ml: 1, color: '#2d3436' }}>
                                <strong>Country:</strong> {result.whois.parsed.country}
                              </Typography>
                            )}
                            {result.whois.parsed.description && (
                              <Typography variant="body2" sx={{ ml: 1, color: '#2d3436' }}>
                                <strong>Description:</strong> {result.whois.parsed.description}
                              </Typography>
                            )}
                          </Box>
                        )}
                        
                        {result.checks && result.checks.length > 0 && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#636e72' }}>
                              🔍 Detection Analysis:
                            </Typography>
                            {result.checks.map((check: any, index: number) => (
                              <Typography 
                                key={index} 
                                variant="body2"
                                sx={{ ml: 1, color: '#2d3436', mb: 0.5 }}
                              >
                                • <strong>{check.type}:</strong> {check.details || (check.result ? 'Detected' : 'Clean')}
                              </Typography>
                            ))}
                          </Box>
                        )}
                      </Box>
                    </Paper>
                  </Box>
                )}
              </CardContent>
            </Card>
      </Container>
    </Box>
  );
};

export default Home;