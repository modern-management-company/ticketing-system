import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Grid,
  Divider
} from '@mui/material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CategoryIcon from '@mui/icons-material/Category';
import PersonIcon from '@mui/icons-material/Person';
import RoomIcon from '@mui/icons-material/Room';

const TicketKanbanBoard = ({ 
  tickets, 
  onTicketMove, 
  onEditTicket, 
  onDeleteTicket, 
  canEdit = false 
}) => {
  const columns = {
    open: {
      id: 'open',
      title: 'Open',
      color: '#f44336'
    },
    'in progress': {
      id: 'in progress',
      title: 'In Progress',
      color: '#2196f3'
    },
    completed: {
      id: 'completed',
      title: 'Completed',
      color: '#4caf50'
    }
  };

  const getTicketsByStatus = (status) => {
    return tickets.filter(ticket => ticket.status.toLowerCase() === status);
  };

  const handleDragEnd = (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const ticket = tickets.find(t => t.ticket_id.toString() === draggableId);
    if (ticket && destination.droppableId !== ticket.status.toLowerCase()) {
      onTicketMove(ticket.ticket_id, destination.droppableId);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Critical':
        return 'error';
      case 'High':
        return 'warning';
      case 'Medium':
        return 'info';
      default:
        return 'success';
    }
  };

  const TicketCard = ({ ticket, index }) => (
    <Draggable
      draggableId={ticket.ticket_id.toString()}
      index={index}
      isDragDisabled={!canEdit}
    >
      {(provided) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          sx={{ 
            mb: 1,
            '&:hover': {
              boxShadow: 3
            }
          }}
        >
          <CardContent>
            <Typography variant="h6" gutterBottom noWrap>
              {ticket.title}
            </Typography>
            <Typography 
              variant="body2" 
              color="textSecondary" 
              sx={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                mb: 1
              }}
            >
              {ticket.description}
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={12}>
                <Chip
                  label={ticket.priority}
                  color={getPriorityColor(ticket.priority)}
                  size="small"
                  sx={{ mr: 1 }}
                />
                {ticket.room_name && (
                  <Tooltip title={`Room: ${ticket.room_name}`}>
                    <Chip
                      icon={<RoomIcon />}
                      label={ticket.room_name}
                      size="small"
                      variant="outlined"
                      sx={{ mr: 1 }}
                    />
                  </Tooltip>
                )}
              </Grid>
              <Grid item xs={12}>
                <Tooltip title={`Category: ${ticket.category}${ticket.subcategory ? ` - ${ticket.subcategory}` : ''}`}>
                  <Chip
                    icon={<CategoryIcon />}
                    label={ticket.category}
                    size="small"
                    variant="outlined"
                    sx={{ mr: 1 }}
                  />
                </Tooltip>
                <Tooltip title={`Created by: ${ticket.created_by_username} (${ticket.created_by_group || 'No Group'})`}>
                  <Chip
                    icon={<PersonIcon />}
                    label={ticket.created_by_username}
                    size="small"
                    variant="outlined"
                  />
                </Tooltip>
              </Grid>
            </Grid>
          </CardContent>
          {canEdit && (
            <CardActions>
              <IconButton size="small" onClick={() => onEditTicket(ticket)}>
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => onDeleteTicket(ticket.ticket_id)} color="error">
                <DeleteIcon fontSize="small" />
              </IconButton>
            </CardActions>
          )}
        </Card>
      )}
    </Draggable>
  );

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Box sx={{ display: 'flex', gap: 2, height: 'calc(100vh - 200px)', overflow: 'hidden' }}>
        {Object.values(columns).map(column => (
          <Paper
            key={column.id}
            sx={{
              flex: 1,
              p: 2,
              backgroundColor: `${column.color}15`,
              borderTop: `3px solid ${column.color}`,
              display: 'flex',
              flexDirection: 'column',
              maxWidth: 350
            }}
          >
            <Typography variant="h6" gutterBottom>
              {column.title} ({getTicketsByStatus(column.id).length})
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Droppable droppableId={column.id}>
              {(provided) => (
                <Box
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  sx={{
                    flex: 1,
                    overflowY: 'auto',
                    minHeight: 100
                  }}
                >
                  {getTicketsByStatus(column.id).map((ticket, index) => (
                    <TicketCard key={ticket.ticket_id} ticket={ticket} index={index} />
                  ))}
                  {provided.placeholder}
                </Box>
              )}
            </Droppable>
          </Paper>
        ))}
      </Box>
    </DragDropContext>
  );
};

export default TicketKanbanBoard; 