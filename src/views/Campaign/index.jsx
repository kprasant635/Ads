import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

// Material-UI
import {
  Card,
  CardHeader,
  CardContent,
  Divider,
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  InputAdornment,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress, // For loading indicator
  Alert,            // For displaying messages
  Snackbar          // For displaying messages
} from '@mui/material';

// Project imports
import Breadcrumb from 'component/Breadcrumb';
import { gridSpacing } from 'config.js';

// Assets
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

// --- Create a custom axios instance for better control ---
const axiosInstance = axios.create({
  baseURL: 'http://172.105.62.110:8000', // Set your base API URL here
  headers: {
    'Content-Type': 'application/json',
  },
});

// Variables to manage token refresh queue (outside component to persist across renders)
let isRefreshing = false;
let failedQueue = [];

// Function to process the queue of failed requests after token refresh
const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const SamplePage = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [loading, setLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    campaignName: '', // Maps to 'name' in API payload
    organizationId: '',
    adamId: '',
    startTime: '',
    endTime: '',
    billingEvent: '',
    budgetAmount: '',
    budgetCurrency: '',
    dailyBudgetAmount: '',
  });
  const [accessToken, setAccessToken] = useState(null); // State to hold the current access token
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success'); // 'success', 'error', 'warning', 'info'
  const [editingCampaignId, setEditingCampaignId] = useState(null); // State to hold the ID of the campaign being edited
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false); // State for delete confirmation dialog
  const [campaignToDelete, setCampaignToDelete] = useState(null); // State to hold campaign object for deletion

  // Dummy data for billing event and budget currency options
  const billingEventOptions = ['TAPS'];
  const budgetCurrencyOptions = ['USD', 'EUR', 'GBP', 'JPY'];

  // Ref to store the latest accessToken, useful for interceptors and callbacks
  const accessTokenRef = useRef(accessToken);
  useEffect(() => {
    accessTokenRef.current = accessToken;
    console.log("accessToken state updated:", accessToken); // Debugging: See when accessToken state changes
    console.log("accessTokenRef.current updated:", accessTokenRef.current); // Debugging: See ref update
  }, [accessToken]);


  // --- Initial Token Acquisition Function ---
  const getInitialAccessToken = useCallback(async () => {
    console.log('Attempting to get initial access token...');
    setSnackbarMessage('Getting session token...');
    setSnackbarSeverity('info');
    setSnackbarOpen(true);

    try {
      // This makes the initial call to your /token endpoint as per your Postman code
      const response = await axios.request({
        method: 'post',
        url: 'http://172.105.62.110:8000/token',
        headers: {
          'Content-Type': 'application/json'
        },
        data: {} // Explicitly empty body as per Postman
      });
      console.log("check_token --- " + response);

      const initialToken = response.data.access_token;
      if (!initialToken) {
          throw new Error("Initial access token not found in response.");
      }
      console.log('Initial token acquired successfully:', initialToken);
      setAccessToken(initialToken); // Set the state with the first token
      setSnackbarMessage('Session ready!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      return initialToken;
    } catch (error) {
      console.log("check_token --- ", error);
      console.error('Failed to get initial access token:', error);
      if (error.response) {
        console.error("Error response data:", error.response.data);
        console.error("Error response status:", error.response.status);
        console.error("Error response headers:", error.response.headers);
      }
      setSnackbarMessage('Failed to initialize session. Please check network/API.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      throw error;
    }
  }, []); // Empty dependency array as it doesn't rely on component state or props for its core logic


  // --- Token Refresh API Call (used by interceptor) ---
  const refreshToken = useCallback(async () => {
    // This console.log will now appear when the interceptor triggers this function
    console.log("Inside refreshToken. accessTokenRef.current:", accessTokenRef.current + "225");
    console.log('Attempting to refresh token...');
    setSnackbarMessage('Refreshing session token...');
    setSnackbarSeverity('info');
    setSnackbarOpen(true);

    try {
      // This endpoint typically uses a refresh_token in the body,
      // but based on your curl command, it might accept an empty POST body.
      const response = await axios.request({
        method: 'post',
        url: 'http://172.105.62.110:8000/token',
        headers: {
          'Content-Type': 'application/json'
        },
        data: {} // Explicitly empty body as per Postman
      });

      const newAccessToken = response.data.access_token;
      if (!newAccessToken) {
          throw new Error("Access token not found in refresh response.");
      }
      console.log('Token refreshed successfully:', newAccessToken);
      setAccessToken(newAccessToken); // Update the main accessToken state
      setSnackbarMessage('Session token refreshed!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      return newAccessToken;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      if (error.response) {
        console.error("Error response data:", error.response.data);
        console.error("Error response status:", error.response.status);
        console.error("Error response headers:", error.response.headers);
      }
      setSnackbarMessage('Session expired. Please log in again.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      throw error;
    }
  }, []); // Dependency array is empty because it doesn't rely on component state or props for its core logic

  // --- Axios Interceptor Setup ---
  useEffect(() => {
    const requestInterceptor = axiosInstance.interceptors.request.use(
      config => {
        const token = accessTokenRef.current;
        // Only add Authorization header if the URL does NOT include '/all_campaigns' or '/create_campaign'
        // as these are explicitly requested to use query parameters.
        if (token && !config.url.includes('/all_campaigns') && !config.url.includes('/create_campaign') && !config.url.includes('/update_campaign') && !config.url.includes('/delete_campaign')) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      error => Promise.reject(error)
    );

    const responseInterceptor = axiosInstance.interceptors.response.use(
      response => response,
      async error => {
        const originalRequest = error.config;
        console.log("Interceptor received error:", error.response?.status, originalRequest.url); // Debugging: Log error status and URL
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          if (!isRefreshing) {
            isRefreshing = true;
            try {
              const newAccessToken = await refreshToken(); // Call refreshToken
              processQueue(null, newAccessToken);

              // Reconstruct the original request URL with the new token
              if (originalRequest.url.includes('/all_campaigns') || originalRequest.url.includes('/create_campaign') || originalRequest.url.includes('/update_campaign') || originalRequest.url.includes('/delete_campaign')) {
                const baseUrl = originalRequest.url.split('?')[0];
                const existingParams = new URLSearchParams(originalRequest.url.split('?')[1]);
                existingParams.set('access_token', newAccessToken); // Update access_token
                originalRequest.url = `${baseUrl}?${existingParams.toString()}`;
              } else {
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
              }
              return axiosInstance(originalRequest);
            } catch (refreshError) {
              processQueue(refreshError, null);
              return Promise.reject(refreshError);
            } finally {
              isRefreshing = false;
            }
          }

          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then(token => {
              // Reconstruct the original request URL with the new token for queued requests
              if (originalRequest.url.includes('/all_campaigns') || originalRequest.url.includes('/create_campaign') || originalRequest.url.includes('/update_campaign') || originalRequest.url.includes('/delete_campaign')) {
                const baseUrl = originalRequest.url.split('?')[0];
                const existingParams = new URLSearchParams(originalRequest.url.split('?')[1]);
                existingParams.set('access_token', token); // Update access_token
                originalRequest.url = `${baseUrl}?${existingParams.toString()}`;
              } else {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              return axiosInstance(originalRequest);
            })
            .catch(err => Promise.reject(err));
        }

        return Promise.reject(error);
      }
    );

    return () => {
      axiosInstance.interceptors.request.eject(requestInterceptor);
      axiosInstance.interceptors.response.eject(responseInterceptor);
    };
  }, [refreshToken]); // refreshToken is a dependency as it's called by the interceptor

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    // Ensure accessToken is available before making the call
    if (!accessTokenRef.current) { // Use ref here too for immediate check
      setSnackbarMessage('No access token available. Please log in or refresh.');
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
      setLoading(false);
      return;
    }
    try {
      const response = await axiosInstance.get(`/all_campaigns?access_token=${accessTokenRef.current}`); // Use ref
      setCampaigns(Array.isArray(response.data) ? response.data : response.data?.data || []);
      setSnackbarMessage('Campaigns fetched successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      setCampaigns([]);
      setSnackbarMessage('Failed to fetch campaigns. Please try again.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  }, []); // No dependency on accessToken here, as it uses accessTokenRef.current

  // --- Initial Component Mount: Fetch initial token ---
  useEffect(() => {
    getInitialAccessToken(); // Call this function to get the first token
  }, [getInitialAccessToken]); // getInitialAccessToken is a dependency

  // Trigger fetchCampaigns when accessToken becomes available or changes
  useEffect(() => {
    if (accessToken) {
      fetchCampaigns();
    } else {
      console.log("No access token present. Cannot fetch campaigns.");
      setSnackbarMessage('Please wait for session to initialize or login.');
      setSnackbarSeverity('info');
      setSnackbarOpen(true);
    }
  }, [accessToken, fetchCampaigns]);

  useEffect(() => {
    const lowerSearch = searchTerm.toLowerCase();
    const searched = campaigns.filter((campaign) =>
      campaign?.name?.toLowerCase().includes(lowerSearch) ||
      campaign?.orgId?.toString().includes(lowerSearch) ||
      campaign?.adamId?.toString().includes(lowerSearch) ||
      campaign?.billingEvent?.toLowerCase().includes(lowerSearch)
    );
    const paginated = searched.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    setFilteredCampaigns(paginated);
    if (paginated.length === 0 && page > 0) {
      setPage(0);
    }
  }, [campaigns, searchTerm, page, rowsPerPage]);

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Helper function to format date-time string
  const formatDateTimeForAPI = (dateTimeString) => {
    if (!dateTimeString) return '';
    // Check if the string already includes seconds (e.g., YYYY-MM-DDTHH:MM:SS)
    // The length for YYYY-MM-DDTHH:MM:SS is 19 characters
    if (dateTimeString.length === 19 && dateTimeString.charAt(10) === 'T' && dateTimeString.charAt(16) === ':') {
      // Already has seconds, just append .000
      return `${dateTimeString}.000`;
    } else if (dateTimeString.length === 16 && dateTimeString.charAt(10) === 'T') {
      // Only has minutes (YYYY-MM-DDTHH:MM), append :00.000
      return `${dateTimeString}:00.000`;
    }
    // Fallback for unexpected formats (though unlikely with datetime-local)
    return dateTimeString;
  };

  const handleOpenCreateModal = () => {
    setEditingCampaignId(null); // Clear any editing state
    setNewCampaign({ // Reset form fields
      campaignName: '',
      organizationId: '',
      adamId: '',
      startTime: '',
      endTime: '',
      billingEvent: '',
      budgetAmount: '',
      budgetCurrency: '',
      dailyBudgetAmount: '',
    });
    setOpenModal(true);
  };

  const handleEditClick = (campaign) => {
    setEditingCampaignId(campaign.id); // Set the ID of the campaign being edited
    // Pre-fill the form with existing campaign data
    setNewCampaign({
      campaignName: campaign.name || '',
      organizationId: campaign.orgId || '',
      adamId: campaign.adamId || '',
      // Ensure time strings are in YYYY-MM-DDTHH:MM:SS format for datetime-local input
      // Remove .000 if present, as datetime-local doesn't show milliseconds
      startTime: campaign.startTime ? campaign.startTime.substring(0, 19) : '',
      endTime: campaign.endTime ? campaign.endTime.substring(0, 19) : '',
      billingEvent: campaign.billingEvent || '',
      budgetAmount: campaign.budgetAmount?.amount?.toString() || '',
      budgetCurrency: campaign.budgetAmount?.currency || '',
      dailyBudgetAmount: campaign.dailyBudgetAmount?.amount?.toString() || '',
    });
    setOpenModal(true);
  };

  const handleDeleteClick = (campaign) => {
    setCampaignToDelete(campaign);
    setOpenConfirmDialog(true);
  };

  const handleConfirmDelete = async () => {
    setOpenConfirmDialog(false);
    if (!campaignToDelete || !accessTokenRef.current) {
      setSnackbarMessage('Error: No campaign selected for deletion or no access token.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    setLoading(true);
    try {
      // console.log(campaignToDelete.orgId);
      // return;
      
      // Assuming delete_campaign endpoint takes 'id' as a query parameter
      const response = await axiosInstance.delete(`/delete_campaign/${campaignToDelete.id}?access_token=${accessTokenRef.current}&orgId=${campaignToDelete.orgId}`);
      console.log('Campaign deleted successfully:', response.data);
      setSnackbarMessage('Campaign deleted successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      fetchCampaigns(); // Refresh the list
    } catch (error) {
      console.error('Error deleting campaign:', error);
      if (error.response) {
        console.error("Error response data:", error.response.data);
        console.error("Error response status:", error.response.status);
        console.error("Error response headers:", error.response.headers);
      }
      setSnackbarMessage('Failed to delete campaign. Please try again.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
      setCampaignToDelete(null); // Clear campaign to delete
    }
  };

  const handleSaveCampaign = async () => {
    if (!accessTokenRef.current) {
      setSnackbarMessage('Cannot perform action: No access token available. Please log in.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    setLoading(true);
    try {
      // Use the helper function to format startTime and endTime
      const formattedStartTime = formatDateTimeForAPI(newCampaign.startTime);
      const formattedEndTime = formatDateTimeForAPI(newCampaign.endTime);

      const commonQueryParams = {
        access_token: accessTokenRef.current,
        orgId: newCampaign.organizationId,
        adam_id: newCampaign.adamId,
        startTime: formattedStartTime,
        endTime: formattedEndTime,
        name: newCampaign.campaignName,
        billingEvent: newCampaign.billingEvent,
        budgetAmount: parseFloat(newCampaign.budgetAmount),
        budgetCurrency: newCampaign.budgetCurrency,
        dailyBudgetAmount: parseFloat(newCampaign.dailyBudgetAmount),
      };

      let response;
      if (editingCampaignId) {
        // EDIT mode: Add campaign ID to query params and use POST (as per user's pattern)
        const updateQueryParams = new URLSearchParams({
          ...commonQueryParams,
          id: editingCampaignId, // Add the ID for update
        }).toString();
        console.log('Updating campaign with query params:', updateQueryParams);
        response = await axiosInstance.post(`/update_campaign?${updateQueryParams}`); // Assuming POST for update
        setSnackbarMessage('Campaign updated successfully!');
      } else {
        // CREATE mode: Use POST
        const createQueryParams = new URLSearchParams(commonQueryParams).toString();
        console.log('Creating campaign with query params:', createQueryParams);
        response = await axiosInstance.post(`/create_campaign?${createQueryParams}`);
        setSnackbarMessage('Campaign created successfully!');
      }

      console.log('API response:', response.data);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setOpenModal(false);
      setEditingCampaignId(null); // Reset editing state
      setNewCampaign({ // Reset form fields
        campaignName: '',
        organizationId: '',
        adamId: '',
        startTime: '',
        endTime: '',
        billingEvent: '',
        budgetAmount: '',
        budgetCurrency: '',
        dailyBudgetAmount: '',
      });
      fetchCampaigns(); // Refresh the list
    } catch (error) {
      console.error('Error saving campaign:', error);
      if (error.response) {
        console.error("Error response data:", error.response.data);
        console.error("Error response status:", error.response.status);
        console.error("Error response headers:", error.response.headers);
      }
      setSnackbarMessage('Failed to save campaign. Please check your input and try again.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const totalFilteredCount = campaigns.filter((campaign) =>
    campaign?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    campaign?.orgId?.toString().includes(searchTerm) ||
    campaign?.adamId?.toString().includes(searchTerm) ||
    campaign?.billingEvent?.toLowerCase().includes(searchTerm.toLowerCase())
  ).length;

  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  return (
    <>
      <Breadcrumb title="Campaign">
        <Typography component={Link} to="/" variant="subtitle2" color="inherit" className="link-breadcrumb">
          Home
        </Typography>
        <Typography variant="subtitle2" color="primary" className="link-breadcrumb">
          Campaign
        </Typography>
      </Breadcrumb>

      <Grid container spacing={gridSpacing}>
        <Grid item xs={12}>
          <Card>
            <CardHeader title={<Typography className="card-header">Campaign List</Typography>} />
            <Divider />
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2, flexWrap: 'wrap', gap: 1 }}>
                <Button variant="contained" onClick={handleOpenCreateModal} disabled={!accessToken}>
                  Create Campaign
                </Button>
                {/* Button to manually trigger token refresh for debugging */}
                {/* <Button variant="outlined" onClick={refreshToken} sx={{ ml: 1 }}>
                  Force Token Refresh (Debug)
                </Button> */}
                <TextField
                  label="Search Campaigns"
                  variant="outlined"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              <TableContainer sx={{ overflowX: 'auto' }}>
                <Table sx={{ minWidth: 900 }} aria-label="campaigns table">
                  <TableHead>
                    <TableRow>
                      <TableCell>Campaign ID</TableCell>
                      <TableCell>Campaign Name</TableCell>
                      <TableCell align="right">Org ID</TableCell>
                      <TableCell align="right">Adam ID</TableCell>
                      <TableCell align="right">Start Time</TableCell>
                      <TableCell align="right">End Time</TableCell>
                      <TableCell align="right">Billing Event</TableCell>
                      <TableCell align="right">Budget</TableCell>
                      <TableCell align="right">Currency</TableCell>
                      <TableCell align="right">Daily Budget</TableCell>
                      <TableCell align="center">Actions</TableCell> {/* New Actions column */}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading && campaigns.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} align="center"> {/* Adjusted colspan */}
                          <CircularProgress size={24} />
                          <Typography>Loading campaigns...</Typography>
                        </TableCell>
                      </TableRow>
                    ) : filteredCampaigns.length > 0 ? (
                      filteredCampaigns.map((campaign) => (
                        <TableRow key={campaign.id}>
                          <TableCell>{campaign.id}</TableCell>
                          <TableCell>{campaign.name}</TableCell>
                          <TableCell align="right">{campaign.orgId}</TableCell>
                          <TableCell align="right">{campaign.adamId}</TableCell>
                          <TableCell align="right">{campaign.startTime}</TableCell>
                          <TableCell align="right">{campaign.endTime}</TableCell>
                          <TableCell align="right">{campaign.billingEvent}</TableCell>
                          <TableCell align="right">{campaign.budgetAmount?.amount?.toLocaleString()}</TableCell>
                          <TableCell align="right">{campaign.budgetAmount?.currency}</TableCell>
                          <TableCell align="right">{campaign.dailyBudgetAmount?.amount?.toLocaleString()}</TableCell>
                          <TableCell align="center">
                            <Button
                              variant="outlined"
                              color="primary"
                              size="small"
                              startIcon={<EditIcon />}
                              onClick={() => handleEditClick(campaign)}
                              disabled={!accessToken}
                              sx={{ mr: 1 }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outlined"
                              color="error"
                              size="small"
                              startIcon={<DeleteIcon />}
                              onClick={() => handleDeleteClick(campaign)}
                              disabled={!accessToken}
                            >
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={10} align="center">No campaigns found.</TableCell> {/* Adjusted colspan */}
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={totalFilteredCount}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Modal Dialog for Create/Edit New Campaign */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingCampaignId ? 'Edit Campaign' : 'Create New Campaign'}</DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth
            margin="normal"
            label="Campaign Name"
            value={newCampaign.campaignName}
            onChange={(e) => setNewCampaign({ ...newCampaign, campaignName: e.target.value })}
            required
          />
          <TextField
            fullWidth
            margin="normal"
            label="Organization ID"
            value={newCampaign.organizationId}
            onChange={(e) => setNewCampaign({ ...newCampaign, organizationId: e.target.value })}
            required
          />
          <TextField
            fullWidth
            margin="normal"
            label="Adam ID"
            value={newCampaign.adamId}
            onChange={(e) => setNewCampaign({ ...newCampaign, adamId: e.target.value })}
            required
          />
          <TextField
            fullWidth
            margin="normal"
            label="Start Time"
            type="datetime-local"
            value={newCampaign.startTime}
            onChange={(e) =>
              setNewCampaign({ ...newCampaign, startTime: e.target.value })
            }
            InputLabelProps={{ shrink: true }}
            required
            inputProps={{ step: 1 }} // Allows seconds input
          />

          <TextField
            fullWidth
            margin="normal"
            label="End Time"
            type="datetime-local"
            value={newCampaign.endTime}
            onChange={(e) =>
              setNewCampaign({ ...newCampaign, endTime: e.target.value })
            }
            InputLabelProps={{ shrink: true }}
            inputProps={{ step: 1 }} // Enable seconds input
            required
          />

          <FormControl fullWidth margin="normal" required>
            <InputLabel id="billing-event-label">Billing Event</InputLabel>
            <Select
              labelId="billing-event-label"
              id="billing-event-select"
              value={newCampaign.billingEvent}
              label="Billing Event"
              onChange={(e) => setNewCampaign({ ...newCampaign, billingEvent: e.target.value })}
            >
              {billingEventOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            margin="normal"
            label="Budget Amount"
            type="number"
            value={newCampaign.budgetAmount}
            onChange={(e) => setNewCampaign({ ...newCampaign, budgetAmount: e.target.value })}
            required
            inputProps={{ min: 0 }}
          />
          <FormControl fullWidth margin="normal" required>
            <InputLabel id="budget-currency-label">Budget Currency</InputLabel>
            <Select
              labelId="budget-currency-label"
              id="budget-currency-select"
              value={newCampaign.budgetCurrency}
              label="Budget Currency"
              onChange={(e) => setNewCampaign({ ...newCampaign, budgetCurrency: e.target.value })}
            >
              {budgetCurrencyOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            margin="normal"
            label="Daily Budget Amount"
            type="number"
            value={newCampaign.dailyBudgetAmount}
            onChange={(e) => setNewCampaign({ ...newCampaign, dailyBudgetAmount: e.target.value })}
            required
            inputProps={{ min: 0 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenModal(false)} color="secondary">Cancel</Button>
          <Button onClick={handleSaveCampaign} color="primary" variant="contained" disabled={loading || !accessToken}>
            {loading ? <CircularProgress size={24} /> : (editingCampaignId ? 'Update' : 'Create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openConfirmDialog}
        onClose={() => setOpenConfirmDialog(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{"Confirm Deletion"}</DialogTitle>
        <DialogContent>
          <Typography id="alert-dialog-description">
            Are you sure you want to delete the campaign "{campaignToDelete?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfirmDialog(false)} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained" autoFocus disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for messages */}
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleSnackbarClose}>
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default SamplePage;
