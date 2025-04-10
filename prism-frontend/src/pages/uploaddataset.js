import React, { useState } from 'react';
import { Container, Typography, Box, Alert, Snackbar } from '@mui/material';
import FileUpload from '../components/FileUpload';

const UploadDataset = () => {
  const [uploadStatus, setUploadStatus] = useState(null);
  const [error, setError] = useState(null);

  const handleUploadSuccess = (data) => {
    setUploadStatus({
      message: 'Dataset uploaded successfully!',
      details: {
        ipfsHash: data.ipfsHash,
        transactionHash: data.transactionHash,
        datasetId: data.datasetId
      }
    });
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Upload Dataset
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Upload your dataset to the blockchain. Supported file types include images, documents, spreadsheets, text files, and more.
        </Typography>

        <FileUpload onUpload={handleUploadSuccess} />

        {uploadStatus && (
          <Alert 
            severity="success" 
            sx={{ mt: 3 }}
            onClose={() => setUploadStatus(null)}
          >
            {uploadStatus.message}
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2">
                IPFS Hash: {uploadStatus.details.ipfsHash}
              </Typography>
              <Typography variant="body2">
                Transaction Hash: {uploadStatus.details.transactionHash}
              </Typography>
              <Typography variant="body2">
                Dataset ID: {uploadStatus.details.datasetId}
              </Typography>
            </Box>
          </Alert>
        )}

        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={() => setError(null)}
        >
          <Alert 
            severity="error" 
            onClose={() => setError(null)}
            sx={{ width: '100%' }}
          >
            {error}
          </Alert>
        </Snackbar>
      </Box>
    </Container>
  );
};

export default UploadDataset;
