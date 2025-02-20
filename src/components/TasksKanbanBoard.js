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
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';

const KanbanBoard = ({ 
  tasks, 
  users, 
  onTaskMove, 
  onEditTask, 
  onDeleteTask, 
  canEdit = false 
}) => {
  const columns = {
    pending: {
      id: 'pending',
      title: 'Pending',
      color: '#ffeb3b'
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

  const getTasksByStatus = (status) => {
    return tasks.filter(task => task.status === status);
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

    const task = tasks.find(t => t.task_id.toString() === draggableId);
    if (task && destination.droppableId !== task.status) {
      onTaskMove(task.task_id, destination.droppableId);
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

  const TaskCard = ({ task, index }) => (
    <Draggable
      draggableId={task.task_id.toString()}
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
              {task.title}
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
              {task.description}
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={12}>
                <Chip
                  label={task.priority}
                  color={getPriorityColor(task.priority)}
                  size="small"
                  sx={{ mr: 1 }}
                />
                {task.due_date && (
                  <Tooltip title={new Date(task.due_date).toLocaleDateString()}>
                    <Chip
                      icon={<AccessTimeIcon />}
                      label="Due Date"
                      size="small"
                      variant="outlined"
                    />
                  </Tooltip>
                )}
              </Grid>
              <Grid item xs={12}>
                <Tooltip title={users.find(u => u.user_id === task.assigned_to_id)?.username || 'Unassigned'}>
                  <Chip
                    icon={<PersonIcon />}
                    label={users.find(u => u.user_id === task.assigned_to_id)?.username || 'Unassigned'}
                    size="small"
                    variant="outlined"
                  />
                </Tooltip>
              </Grid>
            </Grid>
          </CardContent>
          {canEdit && (
            <CardActions>
              <IconButton size="small" onClick={() => onEditTask(task)}>
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => onDeleteTask(task.task_id)} color="error">
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
              {column.title} ({getTasksByStatus(column.id).length})
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
                  {getTasksByStatus(column.id).map((task, index) => (
                    <TaskCard key={task.task_id} task={task} index={index} />
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

export default KanbanBoard; 