import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import SearchIcon from '@mui/icons-material/Search';
import StorageIcon from '@mui/icons-material/Storage';
import HistoryIcon from '@mui/icons-material/History';

const Navbar = () => {
  const navButtons = [
    { path: '/', label: 'Detect', icon: <SearchIcon /> },
    { path: '/bulk', label: 'Bulk Analysis', icon: <StorageIcon /> },
    { path: '/history', label: 'History', icon: <HistoryIcon /> },
  ];

  return (
    <AppBar position="fixed" sx={{ 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
    }}>
      <Toolbar>
        <Typography
          variant="h6"
          component="div"
          sx={{
            flexGrow: 1,
            fontWeight: 700,
            color: '#ffffff',
            letterSpacing: '0.05rem',
          }}
        >
          VPN Detector
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {navButtons.map((btn) => (
            <Button
              key={btn.path}
              component={RouterLink}
              to={btn.path}
              startIcon={btn.icon}
              sx={{
                color: '#ffffff',
                fontWeight: 500,
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                },
              }}
            >
              {btn.label}
            </Button>
          ))}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;