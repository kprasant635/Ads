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
import SearchIcon from '@mui/icons-material/Search';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

// Project imports - Assuming these are available in the project context
// import Breadcrumb from 'component/Breadcrumb';
// import { gridSpacing } from 'config.js'; // Assuming gridSpacing is a number like 2 or 3

// Styled card component
const StyledCard = styled(Card)(({ theme }) => ({
    borderRadius: theme.shape.borderRadius,
    boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)',
    backgroundColor: '#fff',
    marginBottom: theme.spacing(4),
}));

const AdsGroup = () => {
    const [formData, setFormData] = useState({
        campaign_id: '',
        orgId: '',
        name: '',
        start_time: '',
        end_time: '',
    });

    const [loading, setLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    const [searchCampaignId, setSearchCampaignId] = useState('');
    const [searchAdGroupId, setSearchAdGroupId] = useState('');
    const [searchOrgId, setSearchOrgId] = useState('');
    const [searchAccessToken, setSearchAccessToken] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loadingSearch, setLoadingSearch] = useState(false);

    // States for Ad Group Search
    const [adGroupSearch, setAdGroupSearch] = useState({
        campaign_id: '',
        orgId: '',
    });
    const [adGroupResults, setAdGroupResults] = useState([]);
    const [loadingAdGroupSearch, setLoadingAdGroupSearch] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const formatToISOStringWithMilliseconds = (value) => {
        const date = new Date(value);
        // Ensure date is valid before formatting
        if (isNaN(date.getTime())) {
            console.warn("Invalid date provided to formatToISOStringWithMilliseconds:", value);
            return ''; // Return empty string for invalid dates
        }
        return date.toISOString().slice(0, 23); // Keeps up to milliseconds: "YYYY-MM-DDTHH:mm:ss.SSS"
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const tokenResponse = await axios.post(
                'http://172.105.62.110:8000/token',
                {},
                { headers: { 'Content-Type': 'application/json' } }
            );
            const accessToken = tokenResponse.data.access_token;

            const { campaign_id, orgId, name, start_time, end_time } = formData;

            const formattedStart = formatToISOStringWithMilliseconds(start_time);
            const formattedEnd = formatToISOStringWithMilliseconds(end_time);
            console.log("Formatted Start Time for API:", formattedStart);
            console.log("Formatted End Time for API:", formattedEnd);

            const url = `http://172.105.62.110:8000/create_ad_group/${campaign_id}`;

            const response = await axios.post(url, null, {
                params: {
                    access_token: accessToken,
                    orgId,
                    name,
                    start_time: formattedStart,
                    end_time: formattedEnd,
                },
                maxBodyLength: Infinity,
            });

            setSnackbar({ open: true, message: 'Ad Group created successfully!', severity: 'success' });
            console.log('Create Ad Group API response:', response.data);

            // Reset the form after success
            setFormData({
                campaign_id: '',
                orgId: '',
                name: '',
                start_time: '',
                end_time: '',
            });
        } catch (error) {
            console.error('Create Ad Group API error:', error);
            setSnackbar({ open: true, message: `Error creating Ad Group: ${error.message}`, severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        console.log(searchCampaignId, searchAdGroupId, searchOrgId);

        // Validation
        if (!searchCampaignId.trim()) {
            setSnackbar({ open: true, message: 'Please enter a Campaign ID to search.', severity: 'warning' });
            return;
        }
        if (!searchAdGroupId.trim()) {
            setSnackbar({ open: true, message: 'Please enter a Group ID to search.', severity: 'warning' });
            return;
        }
        if (!searchOrgId.trim()) {
            setSnackbar({ open: true, message: 'Please enter a Org ID to search.', severity: 'warning' });
            return;
        }

        setLoadingSearch(true);

        try {
            // Step 1: Get Access Token
            const tokenResponse = await axios.post(
                'http://172.105.62.110:8000/token',
                {},
                { headers: { 'Content-Type': 'application/json' } }
            );
            const accessToken = tokenResponse.data.access_token;

            // Step 2: Build dynamic URL
            const url = `http://172.105.62.110:8000/ad_group/${searchCampaignId}/${searchAdGroupId}`;

            // Step 3: Make GET request with access_token and orgId as query params
            const response = await axios.get(url, {
                params: {
                    access_token: accessToken,
                    orgId: searchOrgId,
                },
                maxBodyLength: Infinity,
            });

            let groupsArraynew = [];
            // Prioritize the structure: [{ data: [...], ... }]
            if (Array.isArray(response.data) && response.data.length > 0 && Array.isArray(response.data[0].data)) {
                groupsArraynew = response.data[0].data;
            }
            // Fallback for direct 'data' property on the main response object
            else if (response.data && Array.isArray(response.data.data)) {
                groupsArraynew = response.data.data;
            }
            // Fallback if response.data itself is an array of ad groups (flat array)
            else if (Array.isArray(response.data)) {
                groupsArraynew = response.data;
            }
            // Fallback if response.data is a single ad group object (wrap in array)
            else if (response.data && typeof response.data === 'object' && response.data !== null) {
                groupsArraynew = [response.data];
            }

            // Step 4: Handle response
            console.log('Raw Ad Group search response:', groupsArraynew[0].data);
            setSearchResults(groupsArraynew);

            setSnackbar({ open: true, message: 'Ad group search successful!', severity: 'success' });

        } catch (error) {
            console.error('Campaign search error:', error);
            setSnackbar({
                open: true,
                message: `Campaign search error: ${error.response?.data?.message || error.message}`,
                severity: 'error',
            });
            setSearchResults([]);
        } finally {
            setLoadingSearch(false);
        }
    };


    const handleReset = () => {
        setSearchCampaignId('');
        setSearchResults([]);
        setSnackbar({ open: true, message: 'Search results reset.', severity: 'info' });
    };

    // --- Handlers for Ad Group Search ---
    const handleAdGroupSearchChange = (e) => {
        const { name, value } = e.target;
        setAdGroupSearch((prev) => ({ ...prev, [name]: value }));
    };

    const handleAdGroupSearch = async () => {
        const { campaign_id, orgId } = adGroupSearch;

        if (!campaign_id.trim() || !orgId.trim()) {
            setSnackbar({ open: true, message: 'Campaign ID and Org ID are required for Ad Group search.', severity: 'warning' });
            return;
        }

        setLoadingAdGroupSearch(true);

        try {
            const tokenResponse = await axios.post(
                'http://172.105.62.110:8000/token',
                {},
                { headers: { 'Content-Type': 'application/json' } }
            );
            const accessToken = tokenResponse.data.access_token;

            const url = `http://172.105.62.110:8000/find_ad_groups/${campaign_id}`;
            const response = await axios.post(url, null, {
                params: {
                    access_token: accessToken,
                    orgId: orgId,
                },
                maxBodyLength: Infinity,
            });

            console.log('Raw Ad Group search response:', response.data);

            let groupsArray = [];
            // Prioritize the structure: [{ data: [...], ... }]
            if (Array.isArray(response.data) && response.data.length > 0 && Array.isArray(response.data[0].data)) {
                groupsArray = response.data[0].data;
            }
            // Fallback for direct 'data' property on the main response object
            else if (response.data && Array.isArray(response.data.data)) {
                groupsArray = response.data.data;
            }
            // Fallback if response.data itself is an array of ad groups (flat array)
            else if (Array.isArray(response.data)) {
                groupsArray = response.data;
            }
            // Fallback if response.data is a single ad group object (wrap in array)
            else if (response.data && typeof response.data === 'object' && response.data !== null) {
                groupsArray = [response.data];
            }

            console.log('Parsed Ad Group data for state:', groupsArray);
            setAdGroupResults(groupsArray);

            setSnackbar({ open: true, message: 'Ad Groups fetched successfully.', severity: 'success' });
        } catch (error) {
            console.error('Ad Group search error:', error);
            setSnackbar({ open: true, message: `Ad Group search error: ${error.message}`, severity: 'error' });
            setAdGroupResults([]);
        } finally {
            setLoadingAdGroupSearch(false);
        }
    };

    const handleAdGroupReset = () => {
        setAdGroupSearch({ campaign_id: '', orgId: '' });
        setAdGroupResults([]);
        setSnackbar({ open: true, message: 'Ad Group search reset.', severity: 'info' });
    };

    // Helper function to format date-time string for display
    const formatDateTimeForDisplay = (dateTimeString) => {
        if (!dateTimeString) return 'N/A';
        try {
            const date = new Date(dateTimeString);
            if (isNaN(date.getTime())) {
                return 'Invalid Date';
            }
            return date.toLocaleString();
        } catch (e) {
            console.error("Error parsing date-time string for display:", dateTimeString, e);
            return 'Invalid Date';
        }
    };

    const handleSnackbarClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbar({ ...snackbar, open: false });
    };

    return (
        <>
            {/* Breadcrumb - Uncomment if you have a Breadcrumb component */}
            {/* <Breadcrumb title="Ads Group">
                <Typography component={Link} to="/" variant="subtitle2" color="inherit" className="link-breadcrumb">
                    Home
                </Typography>
                <Typography variant="subtitle2" color="primary" className="link-breadcrumb">
                    Ads Group
                </Typography>
            </Breadcrumb> */}

            {/* Create Ad Group Form */}
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
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Start Time"
                                    name="start_time"
                                    type="datetime-local"
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                    value={formData.start_time}
                                    onChange={handleChange}
                                    required
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="End Time"
                                    name="end_time"
                                    type="datetime-local"
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                    value={formData.end_time}
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



            {/* Ad Group Search Section */}
            <StyledCard>
                <CardHeader title="Ad Group Search" />
                <CardContent>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={5}>
                            <TextField
                                label="Campaign ID"
                                name="campaign_id"
                                fullWidth
                                size="small"
                                value={adGroupSearch.campaign_id}
                                onChange={handleAdGroupSearchChange}
                            />
                        </Grid>
                        <Grid item xs={12} sm={5}>
                            <TextField
                                label="Org ID"
                                name="orgId"
                                fullWidth
                                size="small"
                                value={adGroupSearch.orgId}
                                onChange={handleAdGroupSearchChange}
                            />
                        </Grid>
                        <Grid item xs={6} sm={1}>
                            <Button
                                variant="contained"
                                color="primary"
                                fullWidth
                                size="small"
                                onClick={handleAdGroupSearch}
                                disabled={loadingAdGroupSearch}
                            >
                                {loadingAdGroupSearch ? <CircularProgress size={20} /> : <SearchIcon fontSize="small" />}
                            </Button>
                        </Grid>
                        <Grid item xs={6} sm={1}>
                            <Button
                                variant="outlined"
                                color="secondary"
                                fullWidth
                                size="small"
                                onClick={handleAdGroupReset}
                                disabled={loadingAdGroupSearch}
                            >
                                <RestartAltIcon fontSize="small" />
                            </Button>
                        </Grid>
                    </Grid>

                    <TableContainer component={Paper} sx={{ marginTop: 3 }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Group ID</TableCell>
                                    <TableCell>Campaign ID</TableCell>
                                    <TableCell>Name</TableCell>
                                    <TableCell>Start Time</TableCell>
                                    <TableCell>End Time</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Org ID</TableCell>
                                    <TableCell>Pricing Model</TableCell>
                                    <TableCell>Display Status</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loadingAdGroupSearch ? (
                                    <TableRow>
                                        <TableCell colSpan={9} align="center">
                                            <CircularProgress size={24} />
                                            <p>Loading ad groups...</p>
                                        </TableCell>
                                    </TableRow>
                                ) : adGroupResults.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} align="center">
                                            No ad groups found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    adGroupResults.map((group, idx) => {
                                        console.log(`Rendering Ad Group at index ${idx}:`, group); // Log each group being rendered
                                        return (
                                            <TableRow key={idx}>
                                                <TableCell>{group.id ?? 'N/A'}</TableCell>
                                                <TableCell>{group.campaignId ?? 'N/A'}</TableCell>
                                                <TableCell>{group.name ?? 'N/A'}</TableCell>
                                                <TableCell>{formatDateTimeForDisplay(group.startTime)}</TableCell>
                                                <TableCell>{formatDateTimeForDisplay(group.endTime)}</TableCell>
                                                <TableCell>{group.status ?? 'N/A'}</TableCell>
                                                <TableCell>{group.orgId ?? 'N/A'}</TableCell>
                                                <TableCell>{group.pricingModel ?? 'N/A'}</TableCell>
                                                <TableCell>{group.displayStatus ?? 'N/A'}</TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </StyledCard>
            {/* Search Campaign Section (Kept as is from your code) */}
            <StyledCard>
                <CardHeader title="Search Ads Group Using GroupId" />
                <CardContent>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={3}>
                            <TextField
                                label="Campaign ID"
                                fullWidth
                                size="small"
                                value={searchCampaignId}
                                onChange={(e) => setSearchCampaignId(e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <TextField
                                label="Ads Group ID"
                                fullWidth
                                size="small"
                                value={searchAdGroupId}
                                onChange={(e) => setSearchAdGroupId(e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <TextField
                                label="Org ID"
                                fullWidth
                                size="small"
                                value={searchOrgId}
                                onChange={(e) => setSearchOrgId(e.target.value)}
                            />
                        </Grid>

                        <Grid item xs={6} sm={1}>
                            <Button
                                variant="contained"
                                color="primary"
                                fullWidth
                                size="small"
                                onClick={handleSearch}
                                disabled={loadingSearch}
                            >
                                {loadingSearch ? <CircularProgress size={20} /> : <SearchIcon fontSize="small" />}
                            </Button>
                        </Grid>
                        <Grid item xs={6} sm={1}>
                            <Button
                                variant="outlined"
                                color="secondary"
                                fullWidth
                                size="small"
                                onClick={handleReset}
                                disabled={loadingSearch}
                            >
                                <RestartAltIcon fontSize="small" />
                            </Button>
                        </Grid>
                    </Grid>


                    {searchResults.length > 0 && (
                        <TableContainer component={Paper} sx={{ marginTop: 3 }}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Ad Group ID</TableCell>
                                        <TableCell>Campaign ID</TableCell>
                                        <TableCell>Name</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Display Status</TableCell>
                                        <TableCell>Serving Status</TableCell>
                                        <TableCell>Org ID</TableCell>
                                        <TableCell>Start Time</TableCell>
                                        <TableCell>End Time</TableCell>
                                        <TableCell>Bid Amount (USD)</TableCell>
                                    </TableRow>
                                </TableHead>

                                <TableBody>
                                    {searchResults.map((row, idx) => {
                                        return (
                                            <TableRow key={idx}>
                                                <TableCell>{row.data.id || 'N/A'}</TableCell>
                                                <TableCell>{row.data.campaignId || 'N/A'}</TableCell>
                                                <TableCell>{row.data.name || 'N/A'}</TableCell>
                                                <TableCell>{row.data.status || 'N/A'}</TableCell>
                                                <TableCell>{row.data.displayStatus || 'N/A'}</TableCell>
                                                <TableCell>{row.data.servingStatus || 'N/A'}</TableCell>
                                                <TableCell>{row.data.orgId || 'N/A'}</TableCell>
                                                <TableCell>{row.data.startTime ? new Date(row.data.startTime).toLocaleString() : 'N/A'}</TableCell>
                                                <TableCell>{row.data.endTime ? new Date(row.data.endTime).toLocaleString() : 'N/A'}</TableCell>
                                                <TableCell>{row.data.defaultBidAmount?.amount || 'N/A'}</TableCell>
                                            </TableRow>
                                        );
                                    })}

                                </TableBody>

                            </Table>
                        </TableContainer>
                    )}

                </CardContent>
            </StyledCard>

            {/* Snackbar for feedback */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={handleSnackbarClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={handleSnackbarClose}
                    severity={snackbar.severity}
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
};

export default AdsGroup;
