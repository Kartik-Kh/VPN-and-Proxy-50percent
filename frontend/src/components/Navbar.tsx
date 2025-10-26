import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const Navbar = () => {
  const navButtons = [
    { path: '/', label: 'Home' },
    { path: '/bulk', label: 'Bulk' },
    { path: '/history', label: 'History' },
  ];

  return (
    <AppBar position="fixed" sx={{ 
      background: '#fff',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      borderBottom: '1px solid #eee'
    }}>
      <Toolbar>
        <Typography
          variant="h6"
          component="div"
          sx={{
            flexGrow: 1,
            fontWeight: 400,
            color: '#555',
            fontSize: '1.1rem'
          }}
        >
          VPN Detector
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {navButtons.map((btn) => (
            <Button
              key={btn.path}
              component={RouterLink}
              to={btn.path}
              sx={{
                color: '#666',
                fontWeight: 400,
                fontSize: '0.9rem',
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: '#f5f5f5',
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