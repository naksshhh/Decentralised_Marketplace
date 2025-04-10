import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Skeleton,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  alpha,
  Divider,
  IconButton,
  Tooltip,
  Avatar,
  Badge,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { useWeb3 } from '../context/Web3Context';
import { datasetApi, transactionApi } from '../services/api';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import SecurityIcon from '@mui/icons-material/Security';
import { initWeb3 } from '../utils/web3';
import RefreshIcon from '@mui/icons-material/Refresh';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import StorageIcon from '@mui/icons-material/Storage';
import TimelineIcon from '@mui/icons-material/Timeline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

const Home = () => {
  const { walletAddress, connectWallet, isConnecting } = useWeb3();
  const [datasets, setDatasets] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [purchaseDialog, setPurchaseDialog] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const theme = useTheme();

  const handleError = (error, type) => {
    // Log error with context
    console.error(`Error in ${type}:`, {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      walletAddress: walletAddress || 'not connected',
    });

    // Set user-friendly error message
    let userMessage = 'An error occurred. Please try again.';
    
    switch (type) {
      case 'wallet':
        userMessage = 'Failed to connect wallet. Please try again.';
        break;
      case 'purchase':
        userMessage = 'Failed to purchase dataset. Please try again.';
        break;
      case 'fetch':
        userMessage = 'Failed to fetch data. Please try again later.';
        break;
      default:
        userMessage = error.message || 'An unexpected error occurred.';
    }

    setError(userMessage);
  };

  const columns = [
    { field: 'id', headerName: 'ID', width: 90 },
    { 
      field: 'title', 
      headerName: 'Title', 
      width: 200,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <StorageIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {params.value}
          </Typography>
        </Box>
      ),
    },
    { 
      field: 'price', 
      headerName: 'Price (ETH)', 
      width: 130,
      renderCell: (params) => (
        <Chip 
          label={`${params.value} ETH`}
          color="primary"
          size="small"
          icon={<TrendingUpIcon />}
          sx={{ fontWeight: 'bold' }}
        />
      ),
    },
    { 
      field: 'owner', 
      headerName: 'Owner', 
      width: 200,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar 
            sx={{ 
              width: 24, 
              height: 24, 
              mr: 1, 
              bgcolor: alpha(theme.palette.primary.main, 0.2),
              color: theme.palette.primary.main,
              fontSize: '0.75rem'
            }}
          >
            {params.value.slice(0, 2).toUpperCase()}
          </Avatar>
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
            {params.value.slice(0, 6)}...{params.value.slice(-4)}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      renderCell: (params) => (
        <Button
          variant="contained"
          color="primary"
          size="small"
          onClick={() => handlePurchaseClick(params.row)}
          disabled={!walletAddress}
          fullWidth
          startIcon={<ShoppingCartIcon />}
          sx={{ 
            borderRadius: 2,
            boxShadow: 'none',
            '&:hover': {
              boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`,
            }
          }}
        >
          Purchase
        </Button>
      ),
    },
  ];

  const transactionColumns = [
    { field: 'id', headerName: 'ID', width: 90 },
    { 
      field: 'type', 
      headerName: 'Type', 
      width: 130,
      renderCell: (params) => (
        <Chip 
          label={params.value}
          color={params.value === 'purchase' ? 'success' : 'default'}
          size="small"
          icon={params.value === 'purchase' ? <ShoppingCartIcon /> : <StorageIcon />}
          sx={{ fontWeight: 'bold' }}
        />
      ),
    },
    { 
      field: 'amount', 
      headerName: 'Amount (ETH)', 
      width: 130,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontWeight: 500, color: theme.palette.primary.main }}>
          {params.value} ETH
        </Typography>
      ),
    },
    { 
      field: 'timestamp', 
      headerName: 'Time', 
      width: 200,
      valueFormatter: (params) => {
        try {
          // If it's an ISO string (from backend), parse it directly
          if (typeof params.value === 'string' && params.value.includes('T')) {
            return new Date(params.value).toLocaleString();
          }
          
          // If it's a Unix timestamp (in seconds), convert to milliseconds
          if (typeof params.value === 'string' && /^\d+$/.test(params.value)) {
            const timestamp = parseInt(params.value, 10);
            if (!isNaN(timestamp)) {
              return new Date(timestamp * 1000).toLocaleString();
            }
          }
          
          // If it's already a Date object or number, use it directly
          const date = new Date(params.value);
          if (!isNaN(date.getTime())) {
            return date.toLocaleString();
          }
          
          // If all else fails, return current date
          console.warn('Invalid timestamp format:', params.value);
          return new Date().toLocaleString();
        } catch (error) {
          console.error('Error formatting transaction date:', error);
          return new Date().toLocaleString();
        }
      }
    },
  ];

  const handlePurchaseClick = (dataset) => {
    setSelectedDataset(dataset);
    setPurchaseDialog(true);
  };

  const handlePurchaseConfirm = async () => {
    try {
      setPurchaseLoading(true);
      await datasetApi.purchaseDataset(selectedDataset.id, selectedDataset.price);
      setPurchaseDialog(false);
      setSelectedDataset(null);
      // Refresh datasets list
      fetchData();
      // Show success message
      setError(null);
    } catch (error) {
      setError(error.message);
      console.error('Purchase failed:', error);
    } finally {
      setPurchaseLoading(false);
    }
  };

  const handlePurchaseCancel = () => {
    setPurchaseDialog(false);
    setSelectedDataset(null);
  };

  const handleConnect = async () => {
    try {
      setLoading(true);
      setError(null);
      await connectWallet();
      // Data will be fetched automatically when wallet is connected
    } catch (error) {
      handleError(error, 'wallet');
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [datasetsData, transactionsData] = await Promise.all([
        datasetApi.getAllDatasets(),
        transactionApi.getRecentTransactions(),
      ]);
      setDatasets(datasetsData);
      setRecentTransactions(transactionsData);
    } catch (error) {
      handleError(error, 'fetch');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initializeWeb3 = async () => {
      try {
        await initWeb3();
        // After Web3 is initialized, fetch data
        fetchData();
      } catch (error) {
        console.error('Failed to initialize Web3:', error);
        setError(error.message);
      }
    };

    initializeWeb3();
  }, []);

  const LoadingSkeleton = () => (
    <Box sx={{ width: '100%' }}>
      <Skeleton variant="rectangular" height={60} sx={{ mb: 2, borderRadius: 2 }} />
      <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
    </Box>
  );

  return (
    <Container maxWidth="lg">
      {/* Hero Section */}
      <Box 
        sx={{ 
          mb: 6, 
          textAlign: 'center',
          py: 4,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.background.paper, 0.1)} 100%)`,
          borderRadius: 4,
          boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.1)}`,
        }}
      >
        <Typography 
          variant="h1" 
          gutterBottom
          sx={{ 
            fontWeight: 700,
            background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            backgroundClip: 'text',
            textFillColor: 'transparent',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Welcome to PRISM
        </Typography>
        <Typography variant="h5" color="text.secondary" paragraph sx={{ mb: 4 }}>
          A decentralized marketplace for secure and private data sharing
        </Typography>
        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12} md={4}>
            <Card 
              sx={{ 
                height: '100%', 
                transition: 'transform 0.3s, box-shadow 0.3s',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: `0 12px 24px ${alpha(theme.palette.primary.main, 0.15)}`,
                },
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    mb: 2,
                  }}
                >
                  <TrendingUpIcon color="primary" sx={{ fontSize: 30 }} />
                </Box>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Trade Data
                </Typography>
                <Typography color="text.secondary">
                  Buy and sell datasets securely on the blockchain
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card 
              sx={{ 
                height: '100%', 
                transition: 'transform 0.3s, box-shadow 0.3s',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: `0 12px 24px ${alpha(theme.palette.primary.main, 0.15)}`,
                },
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    mb: 2,
                  }}
                >
                  <SecurityIcon color="primary" sx={{ fontSize: 30 }} />
                </Box>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Privacy First
                </Typography>
                <Typography color="text.secondary">
                  Your data is protected with advanced encryption
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card 
              sx={{ 
                height: '100%', 
                transition: 'transform 0.3s, box-shadow 0.3s',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: `0 12px 24px ${alpha(theme.palette.primary.main, 0.15)}`,
                },
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    mb: 2,
                  }}
                >
                  <AccountBalanceWalletIcon color="primary" sx={{ fontSize: 30 }} />
                </Box>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Easy Integration
                </Typography>
                <Typography color="text.secondary">
                  Connect your wallet and start trading
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Wallet Connection */}
        <Grid item xs={12}>
          <Paper 
            sx={{ 
              p: 3, 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              borderRadius: 3,
              background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.paper, 0.7)} 100%)`,
              backdropFilter: 'blur(10px)',
              boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.1)}`,
            }}
          >
            <Box>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Connect Your Wallet
              </Typography>
              <Typography color="text.secondary">
                Connect your wallet to access the marketplace
              </Typography>
            </Box>
            {!walletAddress ? (
              <Button
                variant="contained"
                color="primary"
                size="large"
                onClick={handleConnect}
                disabled={isConnecting}
                startIcon={isConnecting ? <CircularProgress size={20} /> : <AccountBalanceWalletIcon />}
                sx={{ 
                  borderRadius: 2,
                  px: 3,
                  py: 1,
                  boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                  '&:hover': {
                    boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.4)}`,
                  }
                }}
              >
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </Button>
            ) : (
              <Chip
                icon={<AccountBalanceWalletIcon />}
                label={`${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`}
                color="primary"
                variant="outlined"
                size="large"
                sx={{ 
                  borderRadius: 2,
                  px: 1,
                  py: 2,
                  borderWidth: 2,
                  '& .MuiChip-label': {
                    fontWeight: 600,
                  }
                }}
              />
            )}
          </Paper>
        </Grid>

        {error && (
          <Grid item xs={12}>
            <Alert 
              severity="error" 
              onClose={() => setError(null)}
              sx={{ 
                mb: 2, 
                borderRadius: 2,
                boxShadow: `0 4px 12px ${alpha(theme.palette.error.main, 0.1)}`,
              }}
              icon={<ErrorOutlineIcon />}
            >
              {error}
            </Alert>
          </Grid>
        )}

        {/* Available Datasets */}
        <Grid item xs={12} md={8}>
          <Paper 
            sx={{ 
              p: 3, 
              borderRadius: 3,
              boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.1)}`,
              overflow: 'hidden',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Available Datasets
              </Typography>
              <Tooltip title="Refresh datasets">
                <IconButton 
                  onClick={fetchData} 
                  disabled={loading}
                  sx={{ 
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.2),
                    }
                  }}
                >
                  <RefreshIcon color="primary" />
                </IconButton>
              </Tooltip>
            </Box>
            {!walletAddress ? (
              <Box 
                sx={{ 
                  py: 6, 
                  textAlign: 'center',
                  bgcolor: alpha(theme.palette.background.paper, 0.5),
                  borderRadius: 2,
                }}
              >
                <AccountBalanceWalletIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
                <Typography color="text.secondary" variant="h6">
                  Please connect your wallet to view available datasets
                </Typography>
              </Box>
            ) : loading ? (
              <LoadingSkeleton />
            ) : (
              <DataGrid
                rows={datasets}
                columns={columns}
                pageSize={5}
                rowsPerPageOptions={[5]}
                autoHeight
                disableSelectionOnClick
                sx={{
                  border: 'none',
                  '& .MuiDataGrid-cell': {
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  },
                  '& .MuiDataGrid-columnHeaders': {
                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  },
                  '& .MuiDataGrid-row:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                  },
                }}
              />
            )}
          </Paper>
        </Grid>

        {/* Recent Transactions */}
        <Grid item xs={12} md={4}>
          <Paper 
            sx={{ 
              p: 3, 
              borderRadius: 3,
              boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.1)}`,
              overflow: 'hidden',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Recent Transactions
              </Typography>
              <Tooltip title="Refresh transactions">
                <IconButton 
                  onClick={fetchData} 
                  disabled={loading}
                  sx={{ 
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.2),
                    }
                  }}
                >
                  <RefreshIcon color="primary" />
                </IconButton>
              </Tooltip>
            </Box>
            {!walletAddress ? (
              <Box 
                sx={{ 
                  py: 6, 
                  textAlign: 'center',
                  bgcolor: alpha(theme.palette.background.paper, 0.5),
                  borderRadius: 2,
                }}
              >
                <TimelineIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
                <Typography color="text.secondary" variant="h6">
                  Please connect your wallet to view recent transactions
                </Typography>
              </Box>
            ) : loading ? (
              <LoadingSkeleton />
            ) : (
              <DataGrid
                rows={recentTransactions}
                columns={transactionColumns}
                pageSize={5}
                rowsPerPageOptions={[5]}
                autoHeight
                disableSelectionOnClick
                sx={{
                  border: 'none',
                  '& .MuiDataGrid-cell': {
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  },
                  '& .MuiDataGrid-columnHeaders': {
                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  },
                  '& .MuiDataGrid-row:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                  },
                }}
              />
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Purchase Confirmation Dialog */}
      <Dialog 
        open={purchaseDialog} 
        onClose={handlePurchaseCancel}
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.2)}`,
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ShoppingCartIcon color="primary" sx={{ mr: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Confirm Purchase</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to purchase this dataset?
          </Typography>
          {selectedDataset && (
            <Box 
              mt={2} 
              p={2} 
              sx={{ 
                bgcolor: alpha(theme.palette.primary.main, 0.05),
                borderRadius: 2,
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Dataset: {selectedDataset.metadata?.description || 'Unnamed Dataset'}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <Chip 
                  icon={<TrendingUpIcon />} 
                  label={`${selectedDataset.price} ETH`} 
                  color="primary" 
                  size="small"
                  sx={{ fontWeight: 'bold' }}
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            onClick={handlePurchaseCancel} 
            disabled={purchaseLoading}
            sx={{ 
              borderRadius: 2,
              px: 3,
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handlePurchaseConfirm} 
            variant="contained" 
            color="primary"
            disabled={purchaseLoading}
            startIcon={purchaseLoading ? <CircularProgress size={20} /> : <CheckCircleIcon />}
            sx={{ 
              borderRadius: 2,
              px: 3,
              boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
              '&:hover': {
                boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.4)}`,
              }
            }}
          >
            {purchaseLoading ? 'Processing...' : 'Confirm Purchase'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Home;
