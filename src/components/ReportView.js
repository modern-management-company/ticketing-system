import React, { useEffect, useState } from "react";
import axios from "axios";

const ReportView = ({ token }) => {
    const [users, setUsers] = useState([]);
    const [properties, setProperties] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const [usersRes, propertiesRes, tasksRes, ticketsRes] = await Promise.all([
                    axios.get("/reports/users", { headers: { Authorization: `Bearer ${token}` } }),
                    axios.get("/reports/properties", { headers: { Authorization: `Bearer ${token}` } }),
                    axios.get("/reports/tasks", { headers: { Authorization: `Bearer ${token}` } }),
                    axios.get("/reports/tickets", { headers: { Authorization: `Bearer ${token}` } }),
                ]);

                setUsers(usersRes.data.users);
                setProperties(propertiesRes.data.properties);
                setTasks(tasksRes.data.tasks);
                setTickets(ticketsRes.data.tickets);
            } catch (err) {
                setError("Failed to fetch reports.");
                console.error(err);
            }
        };

        fetchReports();
    }, [token]);

    return (
        <div>
            <h2>Reports</h2>
            {error && <p style={{ color: "red" }}>{error}</p>}

            <h3>User Report</h3>
            <table border="1">
                <thead>
                    <tr>
                        <th>User ID</th>
                        <th>Username</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((user) => (
                        <tr key={user.user_id}>
                            <td>{user.user_id}</td>
                            <td>{user.username}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <h3>Property Report</h3>
            <table border="1">
                <thead>
                    <tr>
                        <th>Property ID</th>
                        <th>Name</th>
                        <th>Address</th>
                    </tr>
                </thead>
                <tbody>
                    {properties.map((property) => (
                        <tr key={property.property_id}>
                            <td>{property.property_id}</td>
                            <td>{property.name}</td>
                            <td>{property.address}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <h3>Task Report</h3>
            <table border="1">
                <thead>
                    <tr>
                        <th>Task ID</th>
                        <th>Ticket ID</th>
                        <th>Assigned To</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {tasks.map((task) => (
                        <tr key={task.task_id}>
                            <td>{task.task_id}</td>
                            <td>{task.ticket_id}</td>
                            <td>{task.assigned_to_user_id}</td>
                            <td>{task.status}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <h3>Ticket Report</h3>
            <table border="1">
                <thead>
                    <tr>
                        <th>Ticket ID</th>
                        <th>Title</th>
                        <th>Status</th>
                        <th>Priority</th>
                    </tr>
                </thead>
                <tbody>
                    {tickets.map((ticket) => (
                        <tr key={ticket.ticket_id}>
                            <td>{ticket.ticket_id}</td>
                            <td>{ticket.title}</td>
                            <td>{ticket.status}</td>
                            <td>{ticket.priority}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ReportView;
