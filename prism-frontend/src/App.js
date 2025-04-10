import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box } from '@mui/material';
import theme from './theme';
import Navbar from './components/Navbar';
import Home from "./pages/home";
import MyPurchases from "./pages/mypurchases";
import UploadDataset from "./pages/uploaddataset";
import Profile from "./pages/profile";
import { Web3Provider } from './context/Web3Context';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Web3Provider>
        <Router>
          <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Navbar />
            <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/mypurchases" element={<MyPurchases />} />
                <Route path="/upload" element={<UploadDataset />} />
                <Route path="/profile" element={<Profile />} />
              </Routes>
            </Box>
          </Box>
        </Router>
      </Web3Provider>
    </ThemeProvider>
  );
}

export default App;
