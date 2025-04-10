import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton
} from '@mui/material';
import { styled } from '@mui/material/styles';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DescriptionIcon from '@mui/icons-material/Description';
import ImageIcon from '@mui/icons-material/Image';
import AudioFileIcon from '@mui/icons-material/AudioFile';
import VideoFileIcon from '@mui/icons-material/VideoFile';
import CodeIcon from '@mui/icons-material/Code';
import StorageIcon from '@mui/icons-material/Storage';
import FolderZipIcon from '@mui/icons-material/FolderZip';
import CloseIcon from '@mui/icons-material/Close';
import PreviewIcon from '@mui/icons-material/Preview';

const DropzoneArea = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  textAlign: 'center',
  cursor: 'pointer',
  backgroundColor: theme.palette.background.default,
  border: `2px dashed ${theme.palette.primary.main}`,
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

const FileIcon = ({ fileType }) => {
  const type = fileType?.split('/')[0];
  switch (type) {
    case 'image':
      return <ImageIcon sx={{ fontSize: 40, color: 'primary.main' }} />;
    case 'audio':
      return <AudioFileIcon sx={{ fontSize: 40, color: 'primary.main' }} />;
    case 'video':
      return <VideoFileIcon sx={{ fontSize: 40, color: 'primary.main' }} />;
    case 'text':
    case 'application':
      if (fileType?.includes('javascript') || fileType?.includes('python') || fileType?.includes('java')) {
        return <CodeIcon sx={{ fontSize: 40, color: 'primary.main' }} />;
      }
      return <DescriptionIcon sx={{ fontSize: 40, color: 'primary.main' }} />;
    case 'application/x-sqlite3':
    case 'application/x-mysql':
    case 'application/x-postgresql':
      return <StorageIcon sx={{ fontSize: 40, color: 'primary.main' }} />;
    case 'application/zip':
    case 'application/x-rar-compressed':
    case 'application/x-7z-compressed':
      return <FolderZipIcon sx={{ fontSize: 40, color: 'primary.main' }} />;
    default:
      return <DescriptionIcon sx={{ fontSize: 40, color: 'primary.main' }} />;
  }
};

const PreviewDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    maxWidth: '90vw',
    maxHeight: '90vh',
    margin: theme.spacing(2),
  },
}));

const PreviewImage = styled('img')({
  maxWidth: '100%',
  maxHeight: '70vh',
  objectFit: 'contain',
});

const PreviewVideo = styled('video')({
  maxWidth: '100%',
  maxHeight: '70vh',
});

const PreviewAudio = styled('audio')({
  width: '100%',
  marginTop: '20px',
});

const PreviewCode = styled('pre')(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: theme.palette.grey[100],
  borderRadius: theme.shape.borderRadius,
  overflow: 'auto',
  maxHeight: '70vh',
  fontFamily: 'monospace',
}));

const FileUpload = ({ onUpload }) => {
  const [file, setFile] = useState(null);
  const [price, setPrice] = useState('0.01');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    const selectedFile = acceptedFiles[0];
    setFile(selectedFile);
    setError(null);
    
    // Generate initial metadata
    const initialMetadata = {
      originalFilename: selectedFile.name,
      fileType: selectedFile.type,
      fileSize: selectedFile.size,
      uploadDate: new Date().toISOString(),
      description: ''
    };
    setMetadata(initialMetadata);

    // Generate preview if possible
    generatePreview(selectedFile);
  }, []);

  const generatePreview = async (file) => {
    const type = file.type.split('/')[0];
    
    try {
      switch (type) {
        case 'image':
          const imageUrl = URL.createObjectURL(file);
          setPreviewContent({ type: 'image', url: imageUrl });
          break;
        
        case 'video':
          const videoUrl = URL.createObjectURL(file);
          setPreviewContent({ type: 'video', url: videoUrl });
          break;
        
        case 'audio':
          const audioUrl = URL.createObjectURL(file);
          setPreviewContent({ type: 'audio', url: audioUrl });
          break;
        
        case 'text':
          const text = await file.text();
          setPreviewContent({ type: 'text', content: text });
          break;
        
        case 'application':
          if (file.type === 'application/json') {
            const jsonText = await file.text();
            const jsonData = JSON.parse(jsonText);
            setPreviewContent({ 
              type: 'json', 
              content: JSON.stringify(jsonData, null, 2) 
            });
          } else if (file.type === 'text/csv') {
            const csvText = await file.text();
            setPreviewContent({ type: 'csv', content: csvText });
          }
          break;
        
        default:
          setPreviewContent(null);
      }
    } catch (error) {
      console.error('Preview generation error:', error);
      setPreviewContent(null);
    }
  };

  const handlePreviewOpen = () => {
    setPreviewOpen(true);
  };

  const handlePreviewClose = () => {
    setPreviewOpen(false);
    if (previewContent?.url) {
      URL.revokeObjectURL(previewContent.url);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.tiff'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
      'text/html': ['.html', '.htm'],
      'text/xml': ['.xml'],
      'application/json': ['.json'],
      'application/zip': ['.zip'],
      'application/x-rar-compressed': ['.rar'],
      'application/x-7z-compressed': ['.7z'],
      'audio/*': ['.mp3', '.wav', '.ogg', '.midi'],
      'video/*': ['.mp4', '.webm', '.ogg', '.mov'],
      'text/javascript': ['.js'],
      'text/css': ['.css'],
      'text/x-python': ['.py'],
      'text/x-java-source': ['.java'],
      'text/x-c++src': ['.cpp', '.c'],
      'application/x-sqlite3': ['.sqlite', '.db'],
      'application/x-mysql': ['.sql'],
      'application/x-postgresql': ['.sql']
    },
    maxFiles: 1
  });

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      // Create metadata object
      const metadataObj = {
        ...metadata,
        description,
        originalFilename: file.name,
        fileType: file.type,
        fileSize: file.size,
        uploadDate: new Date().toISOString()
      };

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('price', price);
      formData.append('metadata', JSON.stringify(metadataObj));
      formData.append('buyerPublicKey', '04' + '0'.repeat(128)); // Temporary public key for testing

      const response = await fetch('http://localhost:5000/api/datasets/upload-file', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      onUpload(data);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const renderPreview = () => {
    if (!previewContent) return null;

    switch (previewContent.type) {
      case 'image':
        return <PreviewImage src={previewContent.url} alt="Preview" />;
      case 'video':
        return (
          <PreviewVideo controls>
            <source src={previewContent.url} type={file.type} />
            Your browser does not support the video tag.
          </PreviewVideo>
        );
      case 'audio':
        return (
          <PreviewAudio controls>
            <source src={previewContent.url} type={file.type} />
            Your browser does not support the audio tag.
          </PreviewAudio>
        );
      case 'text':
      case 'json':
      case 'csv':
        return <PreviewCode>{previewContent.content}</PreviewCode>;
      default:
        return null;
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Upload Dataset
      </Typography>

      <DropzoneArea {...getRootProps()}>
        <input {...getInputProps()} />
        {file ? (
          <Box>
            <FileIcon fileType={file.type} />
            <Typography variant="body1" sx={{ mt: 2 }}>
              {file.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </Typography>
            <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'center' }}>
              {previewContent && (
                <Button
                  variant="outlined"
                  startIcon={<PreviewIcon />}
                  onClick={handlePreviewOpen}
                >
                  Preview
                </Button>
              )}
              <Button
                variant="outlined"
                color="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  setMetadata(null);
                  setPreviewContent(null);
                }}
              >
                Remove File
              </Button>
            </Box>
          </Box>
        ) : (
          <Box>
            <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main' }} />
            <Typography variant="body1" sx={{ mt: 2 }}>
              {isDragActive
                ? 'Drop the file here'
                : 'Drag and drop a file here, or click to select'}
            </Typography>
          </Box>
        )}
      </DropzoneArea>

      {file && (
        <Box sx={{ mt: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Price (ETH)"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                InputProps={{
                  inputProps: { min: 0, step: 0.01 }
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Grid>
          </Grid>

          {metadata && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                File Metadata
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Chip
                    icon={<DescriptionIcon />}
                    label={`Type: ${metadata.fileType}`}
                    variant="outlined"
                    sx={{ mr: 1, mb: 1 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Chip
                    icon={<StorageIcon />}
                    label={`Size: ${(metadata.fileSize / 1024 / 1024).toFixed(2)} MB`}
                    variant="outlined"
                    sx={{ mr: 1, mb: 1 }}
                  />
                </Grid>
                {metadata.contentType && (
                  <Grid item xs={12} sm={6}>
                    <Chip
                      icon={<DescriptionIcon />}
                      label={`Content: ${metadata.contentType}`}
                      variant="outlined"
                      sx={{ mr: 1, mb: 1 }}
                    />
                  </Grid>
                )}
                {metadata.imageMetadata && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>
                      Image Details:
                    </Typography>
                    <Grid container spacing={1}>
                      <Grid item xs={12} sm={6}>
                        <Chip
                          label={`Dimensions: ${metadata.imageMetadata.width}x${metadata.imageMetadata.height}`}
                          variant="outlined"
                          size="small"
                          sx={{ mr: 1, mb: 1 }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Chip
                          label={`Format: ${metadata.imageMetadata.format}`}
                          variant="outlined"
                          size="small"
                          sx={{ mr: 1, mb: 1 }}
                        />
                      </Grid>
                    </Grid>
                  </Grid>
                )}
                {metadata.spreadsheetMetadata && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>
                      Spreadsheet Details:
                    </Typography>
                    <Grid container spacing={1}>
                      <Grid item xs={12} sm={6}>
                        <Chip
                          label={`Sheets: ${metadata.spreadsheetMetadata.sheetCount}`}
                          variant="outlined"
                          size="small"
                          sx={{ mr: 1, mb: 1 }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Chip
                          label={`First Sheet: ${metadata.spreadsheetMetadata.firstSheet.name}`}
                          variant="outlined"
                          size="small"
                          sx={{ mr: 1, mb: 1 }}
                        />
                      </Grid>
                    </Grid>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              onClick={handleUpload}
              disabled={uploading}
              startIcon={uploading ? <CircularProgress size={20} /> : null}
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </Box>
        </Box>
      )}

      <PreviewDialog
        open={previewOpen}
        onClose={handlePreviewClose}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          File Preview
          <IconButton
            aria-label="close"
            onClick={handlePreviewClose}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {renderPreview()}
        </DialogContent>
        <DialogActions>
          <Button onClick={handlePreviewClose}>Close</Button>
        </DialogActions>
      </PreviewDialog>
    </Box>
  );
};

export default FileUpload;