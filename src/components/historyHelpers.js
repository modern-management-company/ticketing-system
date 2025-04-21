// Utility functions to fetch and parse ticket/task history for reports
import apiClient from './apiClient';

// Fetch history for a ticket
export async function fetchTicketHistory(ticketId) {
  try {
    const res = await apiClient.get(`/tickets/${ticketId}/history`);
    return res.data?.history || [];
  } catch (e) {
    return [];
  }
}

// Fetch history for a task
export async function fetchTaskHistory(taskId) {
  try {
    const res = await apiClient.get(`/tasks/${taskId}/history`);
    return res.data?.history || [];
  } catch (e) {
    return [];
  }
}

// Extract completed info from history
export function getCompletedInfo(history) {
  const completed = history.find(h => 
    h.action === 'completed' || 
    (h.action === 'updated' && h.field_name === 'status' && h.new_value === 'completed')
  );
  
  if (completed) {
    return {
      completedBy: completed.username || completed.user_name || completed.user || 'Unknown',
      completedAt: completed.created_at || completed.timestamp || null,
    };
  }
  return { completedBy: null, completedAt: null };
}

// Extract creator info from history
export function getCreatorInfo(history) {
  const created = history.find(h => h.action === 'created');
  if (created) {
    return {
      createdBy: created.username || created.user_name || created.user || 'Unknown',
      createdAt: created.created_at || created.timestamp || null,
    };
  }
  return { createdBy: null, createdAt: null };
}

// Extract assignment history (array of {assignedTo, assignedBy, assignedAt})
export function getAssignmentHistory(history) {
  return history
    .filter(h => h.action === 'assigned' || (h.action === 'updated' && h.field_name === 'assigned_to'))
    .map(h => ({
      assignedTo: h.new_value || h.assigned_to || h.user,
      assignedBy: h.username || h.user_name || h.user || 'Unknown',
      assignedAt: h.created_at || h.timestamp || null,
    }));
}
