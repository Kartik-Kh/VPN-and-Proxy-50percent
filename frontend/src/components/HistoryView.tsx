import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  MenuItem,
  Card,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import axios from 'axios';

interface HistoryRecord {
  ip: string;
  verdict: 'PROXY/VPN' | 'ORIGINAL';
  score: number;
  createdAt: string;
  checks: Array<{
    type: string;
    result: boolean;
    details: string;
  }>;
}

const HistoryView = () => {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);
  const [verdict, setVerdict] = useState<string>('all');

  useEffect(() => {
    fetchHistory();
  }, [page, rowsPerPage, startDate, endDate, verdict]);

  const fetchHistory = async () => {
    try {
      const params = {
        page,
        limit: rowsPerPage,
        startDate: startDate?.format('YYYY-MM-DD'),
        endDate: endDate?.format('YYYY-MM-DD'),
        verdict: verdict !== 'all' ? verdict : undefined,
      };

      const response = await axios.get('http://localhost:5000/api/history', { params });
      setRecords(response.data.records);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
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
        Analysis History
      </Typography>

      <Card
        sx={{
          p: 4,
          mb: 4,
          background: 'rgba(23, 42, 69, 0.8)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(0, 242, 255, 0.1)',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 3,
            alignItems: 'center',
            width: '100%',
          }}
        >
          <Box sx={{ width: { xs: '100%', md: '33%' } }}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={(newValue) => setStartDate(newValue)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    sx: {
                      '.MuiOutlinedInput-root': {
                        '& fieldset': {
                          borderColor: 'rgba(0, 242, 255, 0.3)',
                        },
                        '&:hover fieldset': {
                          borderColor: 'rgba(0, 242, 255, 0.5)',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: 'primary.main',
                        },
                      },
                      '.MuiInputLabel-root': {
                        color: 'primary.main',
                        fontFamily: '"Roboto Mono", monospace',
                      },
                      '.MuiInputBase-input': {
                        color: 'text.primary',
                        fontFamily: '"Roboto Mono", monospace',
                      }
                    },
                  },
                }}
              />
            </LocalizationProvider>
          </Box>
          <Box sx={{ width: { xs: '100%', md: '33%' } }}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={(newValue) => setEndDate(newValue)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    sx: {
                      '.MuiOutlinedInput-root': {
                        '& fieldset': {
                          borderColor: 'rgba(0, 242, 255, 0.3)',
                        },
                        '&:hover fieldset': {
                          borderColor: 'rgba(0, 242, 255, 0.5)',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: 'primary.main',
                        },
                      },
                      '.MuiInputLabel-root': {
                        color: 'primary.main',
                        fontFamily: '"Roboto Mono", monospace',
                      },
                      '.MuiInputBase-input': {
                        color: 'text.primary',
                        fontFamily: '"Roboto Mono", monospace',
                      }
                    },
                  },
                }}
              />
            </LocalizationProvider>
          </Box>
          <Box sx={{ width: { xs: '100%', md: '33%' } }}>
            <TextField
              select
              fullWidth
              label="Verdict"
              value={verdict}
              onChange={(e) => setVerdict(e.target.value)}
              sx={{
                '.MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: 'rgba(0, 242, 255, 0.3)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(0, 242, 255, 0.5)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'primary.main',
                  },
                },
                '.MuiInputLabel-root': {
                  color: 'primary.main',
                  fontFamily: '"Roboto Mono", monospace',
                },
                '.MuiSelect-select, .MuiInputBase-input': {
                  color: 'text.primary',
                  fontFamily: '"Roboto Mono", monospace',
                },
              }}
            >
              <MenuItem value="all">All Results</MenuItem>
              <MenuItem value="PROXY/VPN">VPN/Proxy Only</MenuItem>
              <MenuItem value="ORIGINAL">Clean IPs Only</MenuItem>
            </TextField>
          </Box>
        </Box>
      </Card>

      <Card
        sx={{
          background: 'rgba(23, 42, 69, 0.8)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(0, 242, 255, 0.1)',
        }}
      >
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    color: 'primary.main',
                    fontFamily: '"Roboto Mono", monospace',
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                  }}
                >
                  IP Address
                </TableCell>
                <TableCell
                  sx={{
                    color: 'primary.main',
                    fontFamily: '"Roboto Mono", monospace',
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                  }}
                >
                  Verdict
                </TableCell>
                <TableCell
                  sx={{
                    color: 'primary.main',
                    fontFamily: '"Roboto Mono", monospace',
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                  }}
                >
                  Score
                </TableCell>
                <TableCell
                  sx={{
                    color: 'primary.main',
                    fontFamily: '"Roboto Mono", monospace',
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                  }}
                >
                  Date
                </TableCell>
                <TableCell
                  sx={{
                    color: 'primary.main',
                    fontFamily: '"Roboto Mono", monospace',
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                  }}
                >
                  Details
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {records.map((record) => (
                <TableRow
                  key={record.ip + record.createdAt}
                  sx={{
                    '&:nth-of-type(odd)': {
                      backgroundColor: 'rgba(0, 242, 255, 0.05)',
                    },
                    '&:hover': {
                      backgroundColor: 'rgba(0, 242, 255, 0.1)',
                    },
                    transition: 'background-color 0.2s ease-in-out',
                  }}
                >
                  <TableCell sx={{ fontFamily: '"Roboto Mono", monospace' }}>
                    {record.ip}
                  </TableCell>
                  <TableCell>
                    <Typography
                      sx={{
                        color: record.verdict === 'PROXY/VPN' ? '#ff0099' : '#00f2ff',
                        fontFamily: '"Roboto Mono", monospace',
                        fontWeight: 'bold',
                      }}
                    >
                      {record.verdict}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ fontFamily: '"Roboto Mono", monospace' }}>
                    {record.score}
                  </TableCell>
                  <TableCell sx={{ fontFamily: '"Roboto Mono", monospace' }}>
                    {dayjs(record.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                  </TableCell>
                  <TableCell>
                    {record.checks.map((check, i) => (
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
          <TablePagination
            component="div"
            count={-1}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 25, 50, 100]}
            sx={{
              color: 'text.primary',
              '.MuiTablePagination-select': {
                color: 'text.primary',
              },
              '.MuiTablePagination-selectIcon': {
                color: 'text.primary',
              },
              '.MuiTablePagination-actions button': {
                color: 'text.primary',
              },
            }}
          />
        </TableContainer>
      </Card>
    </Box>
  );
};

export default HistoryView;