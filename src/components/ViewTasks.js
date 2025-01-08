import React, { useEffect, useState } from "react";
import axios from "axios";

const ViewTasks = ({ token }) => {
    const [tasks, setTasks] = useState([]);
    const [status, setStatus] = useState("");
    const [message, setMessage] = useState("");

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const response = await axios.get("/tasks", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setTasks(response.data.tasks);
            } catch (error) {
                console.error("Failed to fetch tasks", error);
            }
        };

        fetchTasks();
    }, [token]);

    const handleEdit = async (taskId) => {
        try {
            const response = await axios.patch(
                `/tasks/${taskId}`,
                { status },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setMessage(response.data.message);
            setTasks((prev) =>
                prev.map((task) =>
                    task.task_id === taskId ? { ...task, status } : task
                )
            );
        } catch (error) {
            console.error("Failed to edit task", error);
        }
    };

    const handleDelete = async (taskId) => {
        try {
            const response = await axios.delete(`/tasks/${taskId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setMessage(response.data.message);
            setTasks((prev) => prev.filter((task) => task.task_id !== taskId));
        } catch (error) {
            console.error("Failed to delete task", error);
        }
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
                            <td>
                                <select
                                    value={status || task.status}
                                    onChange={(e) => setStatus(e.target.value)}
                                >
                                    <option value="Pending">Pending</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Completed">Completed</option>
                                </select>
                            </td>
                            <td>
                                <button onClick={() => handleEdit(task.task_id)}>Update</button>
                                <button onClick={() => handleDelete(task.task_id)}>Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {message && <p>{message}</p>}
        </div>
    );
};

export default ViewTasks;
