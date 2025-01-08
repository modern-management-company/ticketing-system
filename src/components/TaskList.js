import React, { useState, useEffect } from "react";
import axios from "axios";

const TaskList = ({ token }) => {
    const [tasks, setTasks] = useState([]);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const response = await axios.get("/tasks", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setTasks(response.data.tasks);
            } catch (error) {
                console.error(error);
                setError("Failed to fetch tasks");
            }
        };

        fetchTasks();
    }, [token]);

    return (
        <div>
            <h2>Task List</h2>
            {error && <p>{error}</p>}
            <ul>
                {tasks.map((task) => (
                    <li key={task.task_id}>
                        <p>Task ID: {task.task_id}</p>
                        <p>Ticket ID: {task.ticket_id}</p>
                        <p>Room ID: {task.room_id}</p>
                        <p>Assigned To: {task.assigned_to}</p>
                        <p>Status: {task.status}</p>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default TaskList;
