import React, { useEffect, useState } from "react";
import axios from "axios";

const ViewTasks = ({ token }) => {
    const [tasks, setTasks] = useState([]);

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const response = await axios.get("/tasks", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const tasksWithStatus = response.data.tasks.map((task) => ({
                    ...task,
                    tempStatus: task.status, // Add a temporary status for editing
                }));
                setTasks(tasksWithStatus);
            } catch (error) {
                console.error("Failed to fetch tasks", error);
            }
        };

        fetchTasks();
    }, [token]);

    const updateTaskStatus = async (taskId) => {
        const taskToUpdate = tasks.find((task) => task.task_id === taskId);
        if (!taskToUpdate || !taskToUpdate.tempStatus) {
            alert("Please select a status to update.");
            return;
        }

        try {
            const response = await axios.patch(
                `/tasks/${taskId}`,
                { status: taskToUpdate.tempStatus },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            alert(response.data.message);
            // Update tasks after the status change
            const updatedTasks = tasks.map((task) =>
                task.task_id === taskId ? { ...task, status: taskToUpdate.tempStatus } : task
            );
            setTasks(updatedTasks);
        } catch (error) {
            console.error("Failed to update task status", error);
        }
    };

    const handleStatusChange = (taskId, newStatus) => {
        setTasks((prevTasks) =>
            prevTasks.map((task) =>
                task.task_id === taskId ? { ...task, tempStatus: newStatus } : task
            )
        );
    };

    return (
        <div>
            <h2>View Tasks</h2>
            <table border="1">
                <thead>
                    <tr>
                        <th>Task ID</th>
                        <th>Ticket ID</th>
                        <th>Assigned User</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {tasks.map((task) => (
                        <tr key={task.task_id}>
                            <td>{task.task_id}</td>
                            <td>{task.ticket_id}</td>
                            <td>{task.assigned_to}</td>
                            <td>{task.status}</td>
                            <td>
                                <select
                                    value={task.tempStatus || ""}
                                    onChange={(e) => handleStatusChange(task.task_id, e.target.value)}
                                >
                                    <option value="">Change Status</option>
                                    <option value="Pending">Pending</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Completed">Completed</option>
                                </select>
                                <button onClick={() => updateTaskStatus(task.task_id)}>
                                    Update
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ViewTasks;
