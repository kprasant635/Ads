import React, { useState } from 'react';
import axios from 'axios';
import {
  Card,
  CardHeader,
  CardContent,
  Grid,
  TextField,
  Button,
  Snackbar,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { styled } from '@mui/system';

// Styled components
const StyledCard = styled(Card)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius,
  boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)',
  backgroundColor: '#fff',
  marginBottom: theme.spacing(4),
}));

const AdsGroup = () => {
  // Form state for creating ad group
  const [formData, setFormData] = useState({
    campaign_id: '',
    orgId: '',
    name: '',
  });

  // Loading and snackbar for create form
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Search form state
  const [searchCampaignId, setSearchCampaignId] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  // Handle change for create form
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Submit handler for create ads group
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // First get token
      const tokenResponse = await axios.post(
        'http://172.105.62.110:8000/token',
        {},
        { headers: { 'Content-Type': 'application/json' } }
      );
      const accessToken = tokenResponse.data.access_token;

      const { campaign_id, orgId, name } = formData;
      console.log(campaign_id, orgId, name, accessToken);

      // Remove return to allow actual call
      // Construct URL
      const url = `http://172.105.62.110:8000/create_ad_group/${campaign_id}`;

      const response = await axios.post(url, null, {
        params: {
          access_token: accessToken,
          orgId,
          name,
        },
        maxBodyLength: Infinity,
      });

      setSnackbar({ open: true, message: 'Request successful!', severity: 'success' });
      console.log('API response:', response.data);
    } catch (error) {
      console.error('API error:', error);
      setSnackbar({ open: true, message: `Error: ${error.message}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Search handler for campaign ID
  const handleSearch = async () => {
    if (!searchCampaignId.trim()) {
      setSnackbar({ open: true, message: 'Please enter a Campaign ID to search.', severity: 'warning' });
      return;
    }

    setLoadingSearch(true);
    try {
      // Example API endpoint - replace with your actual search endpoint
      const response = await axios.get(`http://172.105.62.110:8000/search_campaign/${searchCampaignId}`);

      setSearchResults(response.data || []);
      setSnackbar({ open: true, message: 'Search successful!', severity: 'success' });
    } catch (error) {
      console.error('Search API error:', error);
      setSnackbar({ open: true, message: `Search error: ${error.message}`, severity: 'error' });
      setSearchResults([]);
    } finally {
      setLoadingSearch(false);
    }
  };

  return (
    <>
      {/* Card for creating ad group */}
      <StyledCard>
        <CardHeader title="Create Ads Group" />
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Campaign ID"
                  name="campaign_id"
                  fullWidth
                  value={formData.campaign_id}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Org ID"
                  name="orgId"
                  fullWidth
                  value={formData.orgId}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Name"
                  name="name"
                  fullWidth
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <Button variant="contained" color="primary" type="submit" disabled={loading}>
                  {loading ? <CircularProgress size={24} /> : 'Submit'}
                </Button>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </StyledCard>

      {/* Card for searching campaign */}
      <StyledCard>
        <CardHeader title="Search Campaign" />
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={8}>
              <TextField
                label="Campaign ID"
                fullWidth
                value={searchCampaignId}
                onChange={(e) => setSearchCampaignId(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button variant="contained" color="secondary" onClick={handleSearch} disabled={loadingSearch}>
                {loadingSearch ? <CircularProgress size={24} /> : 'Search'}
              </Button>
            </Grid>
          </Grid>

          {/* Display search results in table */}
          {searchResults.length > 0 && (
            <TableContainer component={Paper} sx={{ marginTop: 3 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    {/* Adjust these columns according to your actual data */}
                    <TableCell>Campaign ID</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Org ID</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {searchResults.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{row.campaign_id || row.id || 'N/A'}</TableCell>
                      <TableCell>{row.name || 'N/A'}</TableCell>
                      <TableCell>{row.orgId || 'N/A'}</TableCell>
                      <TableCell>{row.status || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </StyledCard>

      {/* Snackbar for messages */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default AdsGroup;
