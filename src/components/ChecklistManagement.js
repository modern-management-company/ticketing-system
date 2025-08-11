import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  Checkbox,
  FormControlLabel,
  IconButton,
  Switch,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
  Archive as ArchiveIcon,
  Unarchive as UnarchiveIcon,
  Delete as DeleteIcon, // kept for item rows inside the dialog
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import PropertySwitcher from './PropertySwitcher';
import apiClient from './apiClient';

const ChecklistManagement = () => {
  const { auth } = useAuth();

  const [selectedProperty, setSelectedProperty] = useState(null);

  // we store ALL checklists (active + archived) and filter in UI
  const [allChecklists, setAllChecklists] = useState([]);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingChecklist, setEditingChecklist] = useState(null); // FULL checklist (with items)
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [archivingId, setArchivingId] = useState(null);
  const [restoringId, setRestoringId] = useState(null);
  const [showArchived, setShowArchived] = useState(false);

  const [checklistForm, setChecklistForm] = useState({
    title: '',
    description: '',
    checklist_type: 'daily',
    department: '',
    property_id: null,
    items: [] // { item_id?, description, is_required, expected_duration, notes }
  });

  const checklistTypes = ['daily', 'weekly', 'monthly', 'custom'];
  const departments = ['Engineering', 'Housekeeping', 'Front Desk', 'Management', 'IT', 'Security', 'Food & Beverage'];

  useEffect(() => {
    if (!selectedProperty) return;
    fetchChecklists();
  }, [selectedProperty]);

  const handlePropertyChange = (propertyId) => {
    setSelectedProperty(propertyId);
    setChecklistForm(prev => ({ ...prev, property_id: propertyId || null }));
  };

  const fetchChecklists = async () => {
    try {
      setLoading(true);
      setError(null);

      const url = showArchived
        ? `/api/checklists?property_id=${selectedProperty}&only_archived=true`
        : `/api/checklists?property_id=${selectedProperty}`;

      const res = await apiClient.get(url);
      setAllChecklists(res.data.checklists || []);
    } catch (e) {
      console.error('Error fetching checklists:', e);
      if (e.response?.status === 401) setError('Authentication failed. Please log in again.');
      else if (e.response?.status === 403) setError('Access denied.');
      else setError(e.response?.data?.msg || 'Failed to load checklists');
    } finally {
      setLoading(false);
    }
  };
  // ---------- Helpers for item diffing ----------
  const normDur = (v) => {
    if (v === '' || v === null || typeof v === 'undefined') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const itemsToMap = (items) => {
    const map = new Map();
    (items || []).forEach(it => map.set(it.item_id, it));
    return map;
  };

  const itemChanged = (a, b) => {
    return (
      (a.description || '') !== (b.description || '') ||
      Boolean(a.is_required) !== Boolean(b.is_required) ||
      normDur(a.expected_duration) !== normDur(b.expected_duration) ||
      (a.notes || '') !== (b.notes || '')
    );
  };
  // ---------------------------------------------

  const handleOpenDialog = async (listCard = null) => {
    setError(null);
    if (listCard) {
      try {
        const { data } = await apiClient.get(`/api/checklists/${listCard.checklist_id}`);
        setEditingChecklist(data);
        setChecklistForm({
          title: data.title || '',
          description: data.description || '',
          checklist_type: data.checklist_type || 'daily',
          department: data.department || '',
          property_id: selectedProperty,
          items: (data.items || []).map(it => ({
            item_id: it.item_id,
            description: it.description || '',
            is_required: !!it.is_required,
            expected_duration: it.expected_duration ?? '',
            notes: it.notes || ''
          }))
        });
      } catch (e) {
        console.error('Failed to fetch checklist details:', e);
        setError(e.response?.data?.msg || 'Failed to load checklist details');
        return;
      }
      setOpenDialog(true);
    } else {
      setEditingChecklist(null);
      setChecklistForm({
        title: '',
        description: '',
        checklist_type: 'daily',
        department: '',
        property_id: selectedProperty,
        items: []
      });
      setOpenDialog(true);
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingChecklist(null);
    setChecklistForm({
      title: '',
      description: '',
      checklist_type: 'daily',
      department: '',
      property_id: selectedProperty,
      items: []
    });
    setError(null);
  };

  const handleSubmit = async () => {
    if (!checklistForm.title || !checklistForm.department) {
      setError('Title and department are required');
      return;
    }
    if (!selectedProperty) {
      setError('Please select a property first.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (!editingChecklist) {
        const payload = {
          title: checklistForm.title,
          description: checklistForm.description,
          checklist_type: checklistForm.checklist_type,
          department: checklistForm.department,
          property_id: selectedProperty,
          items: (checklistForm.items || []).map((it, idx) => ({
            description: it.description || '',
            is_required: !!it.is_required,
            expected_duration: normDur(it.expected_duration),
            notes: it.notes || '',
            order_index: idx
          }))
        };
        await apiClient.post('/api/checklists', payload);
      } else {
        const checklistId = editingChecklist.checklist_id;

        // 1) meta update
        const meta = {
          title: checklistForm.title,
          description: checklistForm.description,
          checklist_type: checklistForm.checklist_type,
          department: checklistForm.department,
          property_id: selectedProperty
        };
        await apiClient.put(`/api/checklists/${checklistId}`, meta);

        // 2) diff items
        const beforeItems = editingChecklist.items || [];
        const beforeMap = itemsToMap(beforeItems);
        const afterItems = checklistForm.items || [];

        const afterIds = new Set(afterItems.filter(i => i.item_id).map(i => i.item_id));
        const deletes = beforeItems.filter(i => !afterIds.has(i.item_id));

        const updates = afterItems.filter(i => {
          if (!i.item_id) return false;
          const prev = beforeMap.get(i.item_id);
          if (!prev) return false;
          const candidate = { ...i, expected_duration: normDur(i.expected_duration) };
          const prevNorm = { ...prev, expected_duration: normDur(prev.expected_duration) };
          return itemChanged(candidate, prevNorm);
        });

        const creates = afterItems.filter(i => !i.item_id);

        await Promise.all(
          deletes.map(it => apiClient.delete(`/api/checklists/${checklistId}/items/${it.item_id}`))
        );

        await Promise.all(
          updates.map(it =>
            apiClient.put(`/api/checklists/${checklistId}/items/${it.item_id}`, {
              description: it.description || '',
              is_required: !!it.is_required,
              expected_duration: normDur(it.expected_duration),
              notes: it.notes || ''
            })
          )
        );

        for (const it of creates) {
          await apiClient.post(`/api/checklists/${checklistId}/items`, {
            description: it.description || '',
            is_required: !!it.is_required,
            expected_duration: normDur(it.expected_duration),
            notes: it.notes || ''
          });
        }
      }

      await fetchChecklists();
      handleCloseDialog();
    } catch (e) {
      console.error('Error saving checklist:', e);
      setError(e.response?.data?.msg || 'Failed to save checklist');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Archive (soft delete)
  const handleArchiveChecklist = async (checklistId) => {
    if (!window.confirm('Archive this checklist? It will no longer appear in Active view.')) return;
    try {
      setArchivingId(checklistId);
      await apiClient.put(`/api/checklists/${checklistId}`, { is_active: false });
      await fetchChecklists();
    } catch (e) {
      console.error('Error archiving checklist:', e);
      setError(e.response?.data?.msg || 'Failed to archive checklist');
    } finally {
      setArchivingId(null);
    }
  };

  // Restore from archive
  const handleRestoreChecklist = async (checklistId) => {
    try {
      setRestoringId(checklistId);
      await apiClient.put(`/api/checklists/${checklistId}`, { is_active: true });
      await fetchChecklists();
    } catch (e) {
      console.error('Error restoring checklist:', e);
      setError(e.response?.data?.msg || 'Failed to restore checklist');
    } finally {
      setRestoringId(null);
    }
  };

  const addItem = () => {
    setChecklistForm(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { description: '', is_required: true, expected_duration: '', notes: '' } // new (no item_id)
      ]
    }));
  };

  const updateItem = (index, field, value) => {
    setChecklistForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    }));
  };

  const removeItem = (index) => {
    setChecklistForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  // derive lists
  const hasIsActive = allChecklists.length === 0 ? true : allChecklists.some(c => typeof c.is_active !== 'undefined');
  const activeChecklists = hasIsActive
    ? allChecklists.filter(c => c.is_active !== false)
    : allChecklists; // fallback if server doesn't send is_active
  const archivedChecklists = hasIsActive
    ? allChecklists.filter(c => c.is_active === false)
    : []; // if no is_active present, we can't show archived

  const dataSource = showArchived ? archivedChecklists : activeChecklists;

  // -------- UI --------
  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Checklist Management</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Tooltip title="Toggle to view archived checklists">
            <FormControlLabel
              control={
                <Switch
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <ArchiveIcon fontSize="small" />
                  <Typography variant="body2">
                    {showArchived ? 'Showing Archived' : 'Show Archived'}
                  </Typography>
                  {hasIsActive && (
                    <Chip
                      size="small"
                      label={
                        showArchived
                          ? `${archivedChecklists.length}`
                          : `${activeChecklists.length}`
                      }
                      variant="outlined"
                    />
                  )}
                </Box>
              }
            />
          </Tooltip>

          <PropertySwitcher onPropertyChange={handlePropertyChange} />

          {!showArchived && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              disabled={!selectedProperty}
            >
              Create Checklist
            </Button>
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {!selectedProperty ? (
        <Alert severity="info">Please select a property to view checklists</Alert>
      ) : loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {dataSource.map((checklist) => (
            <Grid item xs={12} md={6} lg={4} key={checklist.checklist_id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Typography variant="h6">{checklist.title}</Typography>
                    <Chip
                      label={checklist.checklist_type}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </Box>
                  {checklist.description && (
                    <Typography color="text.secondary" gutterBottom>
                      {checklist.description}
                    </Typography>
                  )}
                  <Box display="flex" gap={1} mb={1}>
                    <Chip label={checklist.department} size="small" />
                    <Chip label={`${checklist.item_count} items`} size="small" variant="outlined" />
                    {typeof checklist.is_active !== 'undefined' && checklist.is_active === false && (
                      <Chip label="Archived" size="small" color="warning" variant="filled" />
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Created by: {checklist.created_by_username}
                  </Typography>
                </CardContent>

                <CardActions>
                  {!showArchived && (
                    <>
                      <Button size="small" startIcon={<EditIcon />} onClick={() => handleOpenDialog(checklist)}>
                        Edit
                      </Button>
                      <Button
                        size="small"
                        startIcon={<CheckCircleIcon />}
                        onClick={() => {
                          apiClient.post(`/api/checklists/${checklist.checklist_id}/complete`, { notes: 'Completed via checklist management' })
                            .then(fetchChecklists)
                            .catch((e) => {
                              console.error(e);
                              setError('Failed to complete checklist');
                            });
                        }}
                      >
                        Complete
                      </Button>
                      <Button
                        size="small"
                        color="warning"
                        startIcon={<ArchiveIcon />}
                        onClick={() => handleArchiveChecklist(checklist.checklist_id)}
                        disabled={archivingId === checklist.checklist_id}
                      >
                        {archivingId === checklist.checklist_id ? 'Archiving…' : 'Archive'}
                      </Button>
                    </>
                  )}

                  {showArchived && (
                    <Button
                      size="small"
                      color="success"
                      startIcon={<UnarchiveIcon />}
                      onClick={() => handleRestoreChecklist(checklist.checklist_id)}
                      disabled={restoringId === checklist.checklist_id}
                    >
                      {restoringId === checklist.checklist_id ? 'Restoring…' : 'Restore'}
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}

          {dataSource.length === 0 && (
            <Grid item xs={12}>
              <Alert severity="info">
                {showArchived
                  ? 'No archived checklists for this property.'
                  : 'No active checklists for this property.'}
              </Alert>
            </Grid>
          )}
        </Grid>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingChecklist ? 'Edit Checklist' : 'Create New Checklist'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Title"
                value={checklistForm.title}
                onChange={(e) => setChecklistForm(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Checklist Type</InputLabel>
                <Select
                  value={checklistForm.checklist_type}
                  onChange={(e) => setChecklistForm(prev => ({ ...prev, checklist_type: e.target.value }))}
                  label="Checklist Type"
                >
                  {checklistTypes.map(type => (
                    <MenuItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Department</InputLabel>
                <Select
                  value={checklistForm.department}
                  onChange={(e) => setChecklistForm(prev => ({ ...prev, department: e.target.value }))}
                  label="Department"
                  required
                >
                  {departments.map(dept => (
                    <MenuItem key={dept} value={dept}>
                      {dept}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Property is selected via PropertySwitcher; no inline property field */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={checklistForm.description}
                onChange={(e) => setChecklistForm(prev => ({ ...prev, description: e.target.value }))}
                multiline
                rows={3}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Checklist Items</Typography>
            <Button startIcon={<AddIcon />} onClick={addItem} variant="outlined" size="small">
              Add Item
            </Button>
          </Box>

          {checklistForm.items.map((item, index) => (
            <Box key={item.item_id ?? `new-${index}`} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Description"
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    required
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    label="Duration (min)"
                    type="number"
                    value={item.expected_duration}
                    onChange={(e) => updateItem(index, 'expected_duration', e.target.value)}
                    inputProps={{ min: 0 }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={!!item.is_required}
                        onChange={(e) => updateItem(index, 'is_required', e.target.checked)}
                      />
                    }
                    label="Required"
                  />
                </Grid>
                <Grid item xs={12} md={1}>
                  <IconButton color="error" onClick={() => removeItem(index)} size="small">
                    <DeleteIcon />
                  </IconButton>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Notes (Optional)"
                    value={item.notes}
                    onChange={(e) => updateItem(index, 'notes', e.target.value)}
                    multiline
                    rows={2}
                  />
                </Grid>
              </Grid>
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={isSubmitting || !selectedProperty}>
            {isSubmitting ? <CircularProgress size={20} /> : (editingChecklist ? 'Update' : 'Create')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChecklistManagement;