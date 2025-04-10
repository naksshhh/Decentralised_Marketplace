import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { userApi, apiCall } from '../services/api';
import { initWeb3, retrieveDataset } from '../utils/web3';
import { useWeb3 } from '../context/Web3Context';

const MyPurchases = () => {
  const { walletAddress } = useWeb3();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [previewDialog, setPreviewDialog] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    const initializeWeb3 = async () => {
      try {
        await initWeb3();
        if (walletAddress) {
          fetchPurchases();
        }
      } catch (error) {
        console.error('Failed to initialize Web3:', error);
        setError(error.message);
      }
    };

    initializeWeb3();
  }, [walletAddress]);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      if (!walletAddress) {
        setError('Please connect your wallet to view purchases');
        return;
      }
      const response = await userApi.getPurchases(walletAddress);
      setPurchases(response);
    } catch (error) {
      setError(error.message);
      console.error('Failed to fetch purchases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async (dataset) => {
    try {
      setPreviewLoading(true);
      await initWeb3();
      const { url } = await retrieveDataset(dataset.datasetId, walletAddress);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error retrieving dataset:', error);
      setError(error.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownload = async (dataset) => {
    try {
      setPreviewLoading(true);
      await initWeb3();
      const { encryptedData } = await retrieveDataset(dataset.datasetId, walletAddress);
      
      // Get the signer from Web3
      const { signer } = await initWeb3();
      
      // Sign a message to prove ownership
      const message = `I authorize the download of dataset ${dataset.datasetId}`;
      const signature = await signer.signMessage(message);
      
      // Create a FormData object to send the file
      const formData = new FormData();
      const blob = new Blob([encryptedData], { type: 'text/plain' });
      formData.append('file', blob, 'encrypted_data.txt');
      formData.append('signature', signature);
      formData.append('message', message);
      formData.append('address', walletAddress);
      
      // Decrypt the data
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/security/decrypt`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to decrypt data');
      }

      const decryptedData = await response.json();
      
      // Create a blob and download link for the decrypted data
      const decryptedBlob = new Blob([decryptedData.decryptedData], { type: 'text/plain' });
      const url = window.URL.createObjectURL(decryptedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${dataset.datasetName || 'dataset'}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading dataset:', error);
      setError(error.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleClosePreview = () => {
    setPreviewDialog(false);
    setSelectedDataset(null);
    setPreviewContent('');
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Box mt={4}>
          <Alert severity="error">{error}</Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box mt={4}>
        <Typography variant="h4" gutterBottom>
          My Purchases
        </Typography>

        {purchases.length === 0 ? (
          <Typography variant="body1" color="textSecondary">
            You haven't purchased any datasets yet.
          </Typography>
        ) : (
          <Grid container spacing={3}>
            {purchases.map((purchase) => (
              <Grid item xs={12} md={6} key={purchase.id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {purchase.datasetName || 'Unnamed Dataset'}
                    </Typography>
                    <Box mb={2}>
                      <Chip
                        label={`Price: ${purchase.price} ETH`}
                        color="primary"
                        size="small"
                        sx={{ mr: 1 }}
                      />
                      <Chip
                        label={`Purchased: ${new Date(purchase.purchaseDate).toLocaleDateString()}`}
                        variant="outlined"
                        size="small"
                      />
                    </Box>
                    <Box mt={2} display="flex" gap={2}>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => handlePreview(purchase)}
                        disabled={previewLoading}
                      >
                        {previewLoading ? <CircularProgress size={24} /> : 'Preview'}
                      </Button>
                      <Button
                        variant="outlined"
                        color="primary"
                        onClick={() => handleDownload(purchase)}
                        disabled={previewLoading}
                      >
                        {previewLoading ? <CircularProgress size={24} /> : 'Download'}
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Preview Dialog */}
        <Dialog
          open={previewDialog}
          onClose={handleClosePreview}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {selectedDataset?.datasetName || 'Dataset Preview'}
          </DialogTitle>
          <DialogContent>
            {previewLoading ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
              </Box>
            ) : (
              <Box>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Content from IPFS:
                </Typography>
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {previewContent}
                </pre>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClosePreview}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default MyPurchases;
