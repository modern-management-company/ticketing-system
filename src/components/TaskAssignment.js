import React, { useState, useEffect } from "react";
import axios from "axios";

const TaskAssignment = ({ token }) => {
    const [tickets, setTickets] = useState([]);
    const [users, setUsers] = useState([]);
    const [ticketId, setTicketId] = useState("");
    const [userId, setUserId] = useState("");
    const [message, setMessage] = useState("");

    useEffect(() => {
        // Fetch tickets
        const fetchTickets = async () => {
            try {
                const response = await axios.get("/tickets", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setTickets(response.data.tickets);
            } catch (error) {
                console.error("Failed to fetch tickets", error);
            }
        };

        // Fetch users
        const fetchUsers = async () => {
            try {
                const response = await axios.get("/users", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setUsers(response.data.users);
            } catch (error) {
                console.error("Failed to fetch users", error);
            }
        };

        fetchTickets();
        fetchUsers();
    }, [token]);

    const assignTask = async (e) => {
        e.preventDefault();
        try {
            // API call to assign a task
            const response = await axios.post(
                "/assign-task",
                { ticket_id: ticketId, user_id: userId },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            setMessage(response.data.message);
        } catch (error) {
            console.error(error);
            setMessage("Failed to assign task");
        }
    };

    return (
        <div>
            <h2>Assign Task</h2>
            <form onSubmit={assignTask}>
                <label>Ticket:</label>
                <select
                    value={ticketId}
                    onChange={(e) => setTicketId(e.target.value)}
                >
                    <option value="">Select Ticket</option>
                    {tickets.map((ticket) => (
                        <option key={ticket.id} value={ticket.id}>
                            {ticket.title} - {ticket.id}
                        </option>
                    ))}
                </select>

                <label>User:</label>
                <select
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                >
                    <option value="">Select User</option>
                    {users.map((user) => (
                        <option key={user.user_id} value={user.user_id}>
                            {user.username}
                        </option>
                    ))}
                </select>

                <button type="submit">Assign Task</button>
            </form>

            {message && <p>{message}</p>}
        </div>
    );
};

export default TaskAssignment;
