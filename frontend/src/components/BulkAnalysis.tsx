import { Box, Typography, Container, Paper, Alert, Button } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ConstructionIcon from '@mui/icons-material/Construction';

const BulkAnalysis = () => {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fafafa', pt: 10 }}>
      <Container maxWidth="md">
        <Paper sx={{ p: 4, textAlign: 'center', border: '2px dashed #ddd' }}>
          <ConstructionIcon sx={{ fontSize: 60, color: '#999', mb: 2 }} />
          <Typography variant="h5" gutterBottom sx={{ color: '#555' }}>
            Bulk IP Analysis
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            CSV upload feature coming soon
          </Typography>
          
          <Box sx={{ mb: 3, p: 3, border: '2px dashed #ccc', borderRadius: 2, bgcolor: '#f9f9f9' }}>
            <CloudUploadIcon sx={{ fontSize: 48, color: '#bbb', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              Upload CSV file (disabled)
            </Typography>
            <Button 
              variant="outlined" 
              disabled 
              sx={{ mt: 2 }}
            >
              Choose File
            </Button>
          </Box>
          
          <Alert severity="info" sx={{ textAlign: 'left' }}>
            <Typography variant="body2" gutterBottom>
              <strong>Planned features:</strong>
            </Typography>
            <Typography variant="caption" component="div">
               Upload CSV with multiple IPs
            </Typography>
            <Typography variant="caption" component="div">
               Process up to 1000 IPs at once
            </Typography>
            <Typography variant="caption" component="div">
               Real-time progress tracking
            </Typography>
            <Typography variant="caption" component="div">
               Download results as CSV/JSON
            </Typography>
          </Alert>
          
          <Box sx={{ mt: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              File processing system pending
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default BulkAnalysis;
