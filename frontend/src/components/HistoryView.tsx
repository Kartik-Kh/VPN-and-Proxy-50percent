import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  TextField,
  MenuItem,
  Stack,
  IconButton,
  Tooltip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import HistoryIcon from '@mui/icons-material/History';

interface HistoryEntry {
  ip: string;
  verdict: string;
  score: number;
  threatLevel: string;
  timestamp: string;
  cached?: boolean;
}

const HistoryView = () => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<HistoryEntry[]>([]);
  const [verdictFilter, setVerdictFilter] = useState<string>('ALL');

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [history, verdictFilter]);

  const loadHistory = () => {
    try {
      const stored = localStorage.getItem('vpn_detection_history');
      if (stored) {
        const parsed = JSON.parse(stored);
        setHistory(parsed);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...history];
    
    if (verdictFilter !== 'ALL') {
      filtered = filtered.filter(entry => entry.verdict === verdictFilter);
    }
    
    // Sort by timestamp descending (newest first)
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    setFilteredHistory(filtered);
  };

  const clearHistory = () => {
    if (window.confirm('Are you sure you want to clear all history?')) {
      localStorage.removeItem('vpn_detection_history');
      setHistory([]);
    }
  };

  const exportToCSV = () => {
    if (filteredHistory.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = ['IP Address', 'Verdict', 'Score', 'Threat Level', 'Timestamp'];
    const rows = filteredHistory.map(entry => [
      entry.ip,
      entry.verdict,
      entry.score,
      entry.threatLevel,
      entry.timestamp
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vpn-detection-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'CLEAN': return 'success';
      case 'SUSPICIOUS': return 'warning';
      case 'VPN_DETECTED': return 'error';
      default: return 'default';
    }
  };

  const getThreatColor = (threat: string) => {
    switch (threat) {
      case 'CLEAN': return 'success';
      case 'LOW': return 'info';
      case 'MEDIUM': return 'warning';
      case 'HIGH': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fafafa', pt: 10 }}>
      <Container maxWidth="lg">
        <Paper sx={{ p: 3 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <HistoryIcon sx={{ fontSize: 32, color: 'primary.main' }} />
              <Typography variant="h5">
                Lookup History
              </Typography>
            </Stack>
            
            <Stack direction="row" spacing={2}>
              <TextField
                select
                size="small"
                value={verdictFilter}
                onChange={(e) => setVerdictFilter(e.target.value)}
                sx={{ minWidth: 150 }}
              >
                <MenuItem value="ALL">All Results</MenuItem>
                <MenuItem value="CLEAN">Clean</MenuItem>
                <MenuItem value="SUSPICIOUS">Suspicious</MenuItem>
                <MenuItem value="VPN_DETECTED">VPN Detected</MenuItem>
              </TextField>
              
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={exportToCSV}
                disabled={filteredHistory.length === 0}
              >
                Export CSV
              </Button>
              
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={clearHistory}
                disabled={history.length === 0}
              >
                Clear All
              </Button>
            </Stack>
          </Stack>

          {filteredHistory.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <HistoryIcon sx={{ fontSize: 60, color: '#ddd', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                {history.length === 0 ? 'No history yet' : 'No results match the filter'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {history.length === 0 ? 'IP lookups will appear here automatically' : 'Try changing the filter'}
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>IP Address</strong></TableCell>
                      <TableCell><strong>Verdict</strong></TableCell>
                      <TableCell align="center"><strong>Score</strong></TableCell>
                      <TableCell align="center"><strong>Threat Level</strong></TableCell>
                      <TableCell><strong>Timestamp</strong></TableCell>
                      <TableCell align="center"><strong>Cached</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredHistory.map((entry, index) => (
                      <TableRow key={index} hover>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">
                            {entry.ip}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={entry.verdict.replace('_', ' ')}
                            color={getVerdictColor(entry.verdict)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" fontWeight="bold">
                            {entry.score}%
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={entry.threatLevel}
                            color={getThreatColor(entry.threatLevel)}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {new Date(entry.timestamp).toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          {entry.cached && (
                            <Tooltip title="Loaded from cache">
                              <Chip label="⚡" size="small" />
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                Showing {filteredHistory.length} of {history.length} total entries
              </Typography>
            </>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default HistoryView;
