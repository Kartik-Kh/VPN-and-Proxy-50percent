import { Box, Typography, Container, Paper, Alert } from '@mui/material';
import ConstructionIcon from '@mui/icons-material/Construction';

const HistoryView = () => {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fafafa', pt: 10 }}>
      <Container maxWidth="md">
        <Paper sx={{ p: 4, textAlign: 'center', border: '2px dashed #ddd' }}>
          <ConstructionIcon sx={{ fontSize: 60, color: '#999', mb: 2 }} />
          <Typography variant="h5" gutterBottom sx={{ color: '#555' }}>
            Lookup History
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Feature in development
          </Typography>
          
          <Alert severity="info" sx={{ textAlign: 'left' }}>
            <Typography variant="body2" gutterBottom>
              <strong>Planned features:</strong>
            </Typography>
            <Typography variant="caption" component="div">
               Store all IP lookups with timestamps
            </Typography>
            <Typography variant="caption" component="div">
               Filter by date range and verdict
            </Typography>
            <Typography variant="caption" component="div">
               Export results to CSV/JSON
            </Typography>
            <Typography variant="caption" component="div">
               User authentication required
            </Typography>
          </Alert>
          
          <Box sx={{ mt: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Database integration pending
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default HistoryView;
