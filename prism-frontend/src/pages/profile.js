import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Divider,
  Avatar,
  Chip,
  Stack,
  Button,
  useTheme,
  alpha,
  IconButton,
  Tooltip,
  Badge,
  Skeleton,
  Container,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { useWeb3 } from '../context/Web3Context';
import { userApi } from '../services/api';
import { initWeb3 } from '../utils/web3';
import { format } from 'date-fns';
import { retrieveDataset } from '../utils/web3';
import PersonIcon from '@mui/icons-material/Person';
import StorageIcon from '@mui/icons-material/Storage';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import TimelineIcon from '@mui/icons-material/Timeline';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

const Profile = () => {
  const { walletAddress } = useWeb3();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ownedDatasets, setOwnedDatasets] = useState([]);
  const [purchasedDatasets, setPurchasedDatasets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [profile, setProfile] = useState({
    username: '',
    email: '',
    walletAddress: '',
    joinDate: '',
    totalPurchases: 0,
    totalUploads: 0,
    totalRevenue: 0,
    totalSpent: 0,
  });
  const theme = useTheme();

  const formatDate = (timestamp) => {
    try {
      // If no timestamp or invalid, return current date
      if (!timestamp || timestamp === 'undefined' || timestamp === 'null') {
        return new Date().toLocaleString();
      }

      // If it's an ISO string (from backend), parse it directly
      if (typeof timestamp === 'string' && timestamp.includes('T')) {
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) {
          return date.toLocaleString();
        }
      }

      // If it's a Unix timestamp (in seconds), convert to milliseconds
      if (typeof timestamp === 'string' && /^\d+$/.test(timestamp)) {
        const numericTimestamp = parseInt(timestamp, 10);
        if (!isNaN(numericTimestamp)) {
          // If timestamp is in seconds (from blockchain), convert to milliseconds
          const date = new Date(numericTimestamp * 1000);
          if (!isNaN(date.getTime())) {
            return date.toLocaleString();
          }
        }
      }

      // If it's already a Date object, use it directly
      if (timestamp instanceof Date) {
        return timestamp.toLocaleString();
      }

      // If all else fails, return current date
      console.warn('Invalid timestamp format:', timestamp);
      return new Date().toLocaleString();
    } catch (error) {
      console.error('Error formatting date:', error, timestamp);
      return new Date().toLocaleString();
    }
  };

  const ownedColumns = [
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
      field: 'purchases', 
      headerName: 'Purchases', 
      width: 130,
      renderCell: (params) => (
        <Chip 
          label={params.value}
          color="secondary"
          size="small"
          icon={<ShoppingCartIcon />}
        />
      ),
    },
    { 
      field: 'revenue', 
      headerName: 'Revenue (ETH)', 
      width: 150,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontWeight: 500, color: theme.palette.success.main }}>
          {params.value} ETH
        </Typography>
      ),
    },
    { 
      field: 'createdAt', 
      headerName: 'Created', 
      width: 180,
      valueFormatter: (params) => {
        try {
          return formatDate(params.value);
        } catch (error) {
          console.error('Error formatting date:', error);
          return new Date().toLocaleString();
        }
      }
    },
  ];

  const purchasedColumns = [
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
      field: 'seller', 
      headerName: 'Seller', 
      width: 200,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar 
            sx={{ 
              width: 24, 
              height: 24, 
              mr: 1, 
              bgcolor: alpha(theme.palette.secondary.main, 0.2),
              color: theme.palette.secondary.main,
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
      field: 'purchaseDate', 
      headerName: 'Purchased', 
      width: 180,
      valueFormatter: (params) => {
        try {
          return formatDate(params.value);
        } catch (error) {
          console.error('Error formatting date:', error);
          return new Date().toLocaleString();
        }
      }
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
      width: 180,
      valueFormatter: (params) => {
        try {
          return formatDate(params.value);
        } catch (error) {
          console.error('Error formatting transaction date:', error);
          return new Date().toLocaleString();
        }
      }
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 130,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={params.value === 'completed' ? 'success' : 'warning'}
          size="small"
          icon={params.value === 'completed' ? <CheckCircleIcon /> : <ErrorOutlineIcon />}
        />
      ) 
    },
  ];

  useEffect(() => {
    const initializeWeb3 = async () => {
      try {
        await initWeb3();
        fetchProfile();
      } catch (error) {
        console.error('Failed to initialize Web3:', error);
        setError(error.message);
      }
    };

    initializeWeb3();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { signer } = await initWeb3();
      const address = await signer.getAddress();
      
      const [profileData, statsData] = await Promise.all([
        userApi.getProfile(),
        userApi.getProfileStats()
      ]);
      
      setProfile({
        ...profileData,
        totalPurchases: statsData.totalPurchases,
        totalUploads: statsData.totalUploads,
        totalRevenue: statsData.totalRevenue,
        totalSpent: statsData.totalSpent,
        walletAddress: address
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDataset = async (datasetId) => {
    try {
      const { url } = await retrieveDataset(datasetId, walletAddress);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error viewing dataset:', error);
      setError(error.message);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [ownedData, purchasedData, transactionData] = await Promise.all([
        userApi.getOwnedDatasets(),
        userApi.getPurchasedDatasets(),
        userApi.getTransactionHistory(),
      ]);
      
      // Transform the data to match the expected format
      const transformedOwnedData = ownedData.map(dataset => ({
        id: dataset.id,
        title: dataset.metadata?.title || 'Untitled Dataset',
        price: dataset.price,
        purchases: dataset.accessCount,
        revenue: (Number(dataset.price) * Number(dataset.accessCount)).toFixed(4),
        createdAt: dataset.timestamp || Date.now()
      }));

      const transformedPurchasedData = purchasedData.map(dataset => ({
        id: dataset.id,
        title: dataset.metadata?.title || 'Untitled Dataset',
        price: dataset.price,
        purchaseDate: dataset.purchaseDate || Date.now(),
        seller: dataset.owner
      }));

      // Transform transaction data
      const transformedTransactionData = transactionData.map(transaction => ({
        ...transaction,
        timestamp: transaction.timestamp || Date.now()
      }));

      setOwnedDatasets(transformedOwnedData);
      setPurchasedDatasets(transformedPurchasedData);
      setTransactions(transformedTransactionData);
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError('Failed to fetch user data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (walletAddress) {
      fetchData();
    }
  }, [walletAddress]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const LoadingSkeleton = () => (
    <Box sx={{ width: '100%' }}>
      <Skeleton variant="rectangular" height={60} sx={{ mb: 2, borderRadius: 2 }} />
      <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
    </Box>
  );

  return (
    <Box sx={{ py: 4 }}>
      <Container maxWidth="lg">
        {error && (
          <Alert 
            severity="error" 
            onClose={() => setError(null)}
            sx={{ 
              mb: 3, 
              borderRadius: 2,
              boxShadow: `0 4px 12px ${alpha(theme.palette.error.main, 0.1)}`,
            }}
            icon={<ErrorOutlineIcon />}
          >
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Profile Card */}
          <Grid item xs={12} md={4}>
            <Card 
              sx={{ 
                borderRadius: 3,
                boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.1)}`,
                overflow: 'hidden',
              }}
            >
              <Box 
                sx={{ 
                  p: 3, 
                  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.background.paper, 0.1)} 100%)`,
                  textAlign: 'center',
                }}
              >
                <Avatar 
                  sx={{ 
                    width: 100, 
                    height: 100, 
                    mx: 'auto', 
                    mb: 2,
                    bgcolor: alpha(theme.palette.primary.main, 0.2),
                    color: theme.palette.primary.main,
                    fontSize: '2.5rem',
                    boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.2)}`,
                  }}
                >
                  <PersonIcon fontSize="large" />
                </Avatar>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                  {profile.username || 'Anonymous User'}
                </Typography>
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    mb: 1,
                  }}
                >
                  <AccountBalanceWalletIcon sx={{ mr: 1, color: 'text.secondary', fontSize: '1rem' }} />
                  <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                    {profile.walletAddress ? 
                      `${profile.walletAddress.slice(0, 6)}...${profile.walletAddress.slice(-4)}` : 
                      'Not connected'}
                  </Typography>
                </Box>
                <Chip 
                  label={profile.email || 'No email provided'} 
                  size="small" 
                  sx={{ mt: 1 }}
                />
              </Box>

              <Divider sx={{ my: 2 }} />
              <Stack spacing={2} sx={{ p: 3 }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                    <CalendarTodayIcon sx={{ mr: 1, fontSize: '1rem' }} />
                    Member Since
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500, ml: 3 }}>
                    {profile.joinDate ? format(new Date(profile.joinDate), 'MMMM yyyy') : 'N/A'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                    <StorageIcon sx={{ mr: 1, fontSize: '1rem' }} />
                    Total Uploads
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500, ml: 3 }}>
                    {profile.totalUploads}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                    <ShoppingCartIcon sx={{ mr: 1, fontSize: '1rem' }} />
                    Total Purchases
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500, ml: 3 }}>
                    {profile.totalPurchases}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                    <TrendingUpIcon sx={{ mr: 1, fontSize: '1rem' }} />
                    Total Revenue
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500, ml: 3, color: theme.palette.success.main }}>
                    {profile.totalRevenue} ETH
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                    <AccountBalanceWalletIcon sx={{ mr: 1, fontSize: '1rem' }} />
                    Total Spent
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500, ml: 3, color: theme.palette.error.main }}>
                    {profile.totalSpent} ETH
                  </Typography>
                </Box>
              </Stack>
            </Card>
          </Grid>

          {/* Tabs and Content */}
          <Grid item xs={12} md={8}>
            <Paper 
              sx={{ 
                borderRadius: 3,
                boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.1)}`,
                overflow: 'hidden',
              }}
            >
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs 
                  value={activeTab} 
                  onChange={handleTabChange} 
                  aria-label="profile tabs"
                  sx={{
                    '& .MuiTab-root': {
                      fontWeight: 600,
                      textTransform: 'none',
                      minHeight: 64,
                    },
                    '& .Mui-selected': {
                      color: theme.palette.primary.main,
                    },
                    '& .MuiTabs-indicator': {
                      backgroundColor: theme.palette.primary.main,
                      height: 3,
                    },
                  }}
                >
                  <Tab 
                    icon={<StorageIcon />} 
                    label="My Datasets" 
                    iconPosition="start"
                  />
                  <Tab 
                    icon={<ShoppingCartIcon />} 
                    label="Purchased Datasets" 
                    iconPosition="start"
                  />
                  <Tab 
                    icon={<TimelineIcon />} 
                    label="Transaction History" 
                    iconPosition="start"
                  />
                </Tabs>
              </Box>

              <Box sx={{ p: 3 }}>
                {loading ? (
                  <LoadingSkeleton />
                ) : (
                  <>
                    {activeTab === 0 && (
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            My Datasets
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
                        {ownedDatasets.length === 0 ? (
                          <Box 
                            sx={{ 
                              py: 6, 
                              textAlign: 'center',
                              bgcolor: alpha(theme.palette.background.paper, 0.5),
                              borderRadius: 2,
                            }}
                          >
                            <StorageIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
                            <Typography color="text.secondary" variant="h6">
                              You haven't uploaded any datasets yet
                            </Typography>
                          </Box>
                        ) : (
                          <DataGrid
                            rows={ownedDatasets}
                            columns={ownedColumns}
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
                      </Box>
                    )}

                    {activeTab === 1 && (
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            Purchased Datasets
                          </Typography>
                          <Tooltip title="Refresh purchases">
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
                        {purchasedDatasets.length === 0 ? (
                          <Box 
                            sx={{ 
                              py: 6, 
                              textAlign: 'center',
                              bgcolor: alpha(theme.palette.background.paper, 0.5),
                              borderRadius: 2,
                            }}
                          >
                            <ShoppingCartIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
                            <Typography color="text.secondary" variant="h6">
                              You haven't purchased any datasets yet
                            </Typography>
                          </Box>
                        ) : (
                          <DataGrid
                            rows={purchasedDatasets}
                            columns={purchasedColumns}
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
                      </Box>
                    )}

                    {activeTab === 2 && (
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            Transaction History
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
                        {transactions.length === 0 ? (
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
                              No transaction history available
                            </Typography>
                          </Box>
                        ) : (
                          <DataGrid
                            rows={transactions}
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
                      </Box>
                    )}
                  </>
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Profile;
