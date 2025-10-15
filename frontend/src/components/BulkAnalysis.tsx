import { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Card,
  CardContent,
} from '@mui/material';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface ResultType {
  ip: string;
  verdict: 'PROXY/VPN' | 'ORIGINAL';
  score: number;
  checks: Array<{
    type: string;
    result: boolean;
    details: string;
  }>;
}

const BulkAnalysis = () => {
  const [results, setResults] = useState<ResultType[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      try {
        setProcessing(true);
        setError(null);
        const reader = new FileReader();
        
        reader.onload = async (e) => {
          const text = e.target?.result as string;
          const ips = text.split('\\n').map(ip => ip.trim()).filter(Boolean);
          
          const results = [];
          let processed = 0;
          
          for (const ip of ips) {
            try {
              const response = await axios.post('http://localhost:5000/api/detect', { ip });
              results.push(response.data);
              processed++;
              setProgress((processed / ips.length) * 100);
            } catch (err) {
              console.error(`Error processing IP ${ip}:`, err);
              results.push({
                ip,
                verdict: 'ERROR',
                score: 0,
                checks: [{
                  type: 'ERROR',
                  result: false,
                  details: 'Failed to process IP'
                }]
              });
            }
          }
          
          setResults(results);
        };
        
        reader.readAsText(file);
      } catch (err) {
        setError('Error processing file');
        console.error('File processing error:', err);
      } finally {
        setProcessing(false);
        setProgress(0);
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt']
    },
    multiple: false
  });

  const chartData = {
    labels: ['VPN/Proxy', 'Original'],
    datasets: [{
      label: 'IP Analysis Results',
      data: [
        results.filter(r => r.verdict === 'PROXY/VPN').length,
        results.filter(r => r.verdict === 'ORIGINAL').length
      ],
      backgroundColor: ['rgba(255, 99, 132, 0.5)', 'rgba(75, 192, 192, 0.5)'],
      borderColor: ['rgba(255, 99, 132, 1)', 'rgba(75, 192, 192, 1)'],
      borderWidth: 1
    }]
  };

  return (
    <Box sx={{ py: 10 }}>
      <Typography
        variant="h4"
        gutterBottom
        sx={{
          fontFamily: '"Roboto Mono", monospace',
          background: 'linear-gradient(45deg, #00f2ff 30%, #ff0099 90%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 'bold',
          textAlign: 'center',
          mb: 4
        }}
      >
        Bulk IP Analysis
      </Typography>

      <Card
        {...getRootProps()}
        sx={{
          p: 5,
          mb: 4,
          textAlign: 'center',
          cursor: 'pointer',
          background: 'rgba(23, 42, 69, 0.8)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(0, 242, 255, 0.1)',
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            transform: 'translateY(-5px)',
            boxShadow: '0 10px 20px rgba(0, 242, 255, 0.2)',
            borderColor: 'rgba(0, 242, 255, 0.3)',
          },
        }}
      >
        <input {...getInputProps()} />
        <Typography
          sx={{
            color: isDragActive ? 'primary.main' : 'text.primary',
            fontFamily: '"Roboto Mono", monospace',
          }}
        >
          {isDragActive
            ? '>> Drop the file here...'
            : '>> Drag and drop a text file containing IP addresses (one per line), or click to select'}
        </Typography>
      </Card>

      {processing && (
        <Card sx={{ p: 3, mb: 4 }}>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 10,
              borderRadius: 5,
              bgcolor: 'rgba(0, 242, 255, 0.1)',
              '& .MuiLinearProgress-bar': {
                background: 'linear-gradient(90deg, #00f2ff, #ff0099)',
              },
            }}
          />
          <Typography
            variant="body2"
            sx={{
              color: 'primary.main',
              textAlign: 'center',
              mt: 1,
              fontFamily: '"Roboto Mono", monospace',
            }}
          >
            Processing... {Math.round(progress)}%
          </Typography>
        </Card>
      )}

      {error && (
        <Alert
          severity="error"
          sx={{
            mb: 4,
            background: 'rgba(255, 0, 0, 0.1)',
            borderColor: 'error.main',
          }}
        >
          {error}
        </Alert>
      )}

      {results.length > 0 && (
        <>
          <Card sx={{ mb: 4, p: 3 }}>
            <CardContent>
              <Typography
                variant="h6"
                gutterBottom
                sx={{
                  fontFamily: '"Roboto Mono", monospace',
                  color: 'primary.main',
                }}
              >
                Results Summary
              </Typography>
              <Box sx={{ height: 300 }}>
                <Bar
                  data={{
                    ...chartData,
                    datasets: [{
                      ...chartData.datasets[0],
                      backgroundColor: ['rgba(255, 0, 99, 0.5)', 'rgba(0, 242, 255, 0.5)'],
                      borderColor: ['rgba(255, 0, 99, 1)', 'rgba(0, 242, 255, 1)'],
                    }],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'top' as const,
                        labels: {
                          color: '#ffffff',
                          font: {
                            family: '"Roboto Mono", monospace',
                          },
                        },
                      },
                      title: {
                        display: true,
                        text: 'Analysis Results Distribution',
                        color: '#ffffff',
                        font: {
                          family: '"Roboto Mono", monospace',
                          size: 16,
                        },
                      },
                    },
                    scales: {
                      y: {
                        ticks: {
                          color: '#ffffff',
                          font: {
                            family: '"Roboto Mono", monospace',
                          },
                        },
                        grid: {
                          color: 'rgba(255, 255, 255, 0.1)',
                        },
                      },
                      x: {
                        ticks: {
                          color: '#ffffff',
                          font: {
                            family: '"Roboto Mono", monospace',
                          },
                        },
                        grid: {
                          color: 'rgba(255, 255, 255, 0.1)',
                        },
                      },
                    },
                  }}
                />
              </Box>
            </CardContent>
          </Card>

          <Card
            sx={{
              background: 'rgba(23, 42, 69, 0.8)',
              backdropFilter: 'blur(10px)',
              borderColor: 'rgba(0, 242, 255, 0.1)',
            }}
          >
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: 'primary.main', fontFamily: '"Roboto Mono", monospace' }}>
                      IP Address
                    </TableCell>
                    <TableCell sx={{ color: 'primary.main', fontFamily: '"Roboto Mono", monospace' }}>
                      Verdict
                    </TableCell>
                    <TableCell sx={{ color: 'primary.main', fontFamily: '"Roboto Mono", monospace' }}>
                      Score
                    </TableCell>
                    <TableCell sx={{ color: 'primary.main', fontFamily: '"Roboto Mono", monospace' }}>
                      Details
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {results.map((result, index) => (
                    <TableRow
                      key={index}
                      sx={{
                        '&:nth-of-type(odd)': {
                          backgroundColor: 'rgba(0, 242, 255, 0.05)',
                        },
                        '&:hover': {
                          backgroundColor: 'rgba(0, 242, 255, 0.1)',
                        },
                      }}
                    >
                      <TableCell sx={{ fontFamily: '"Roboto Mono", monospace' }}>
                        {result.ip}
                      </TableCell>
                      <TableCell>
                        <Typography
                          sx={{
                            color: result.verdict === 'PROXY/VPN' ? '#ff0099' : '#00f2ff',
                            fontFamily: '"Roboto Mono", monospace',
                            fontWeight: 'bold',
                          }}
                        >
                          {result.verdict}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ fontFamily: '"Roboto Mono", monospace' }}>
                        {result.score}
                      </TableCell>
                      <TableCell>
                        {result.checks.map((check, i) => (
                          <Typography
                            key={i}
                            variant="body2"
                            sx={{
                              color: 'text.secondary',
                              fontFamily: '"Roboto Mono", monospace',
                              fontSize: '0.8rem',
                            }}
                          >
                            {check.type}: {check.details}
                          </Typography>
                        ))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </>
      )}
    </Box>
  );
};

export default BulkAnalysis;