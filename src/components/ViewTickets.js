import React, { useEffect, useState } from "react";
import axios from "axios";

const ViewTickets = ({ token }) => {
    const [tickets, setTickets] = useState([]);
    const [status, setStatus] = useState({});

    useEffect(() => {
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

        fetchTickets();
    }, [token]);

    const updateTicketStatus = async (ticketId) => {
        try {
            const response = await axios.patch(
                `/tickets/${ticketId}`,
                { status: status[ticketId] },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            alert(response.data.message);
            // Update the ticket status in the UI
            setTickets((prevTickets) =>
                prevTickets.map((ticket) =>
                    ticket.id === ticketId
                        ? { ...ticket, status: status[ticketId] }
                        : ticket
                )
            );
        } catch (error) {
            console.error("Failed to update ticket status", error);
        }
    };

    const handleStatusChange = (ticketId, newStatus) => {
        setStatus((prevStatus) => ({
            ...prevStatus,
            [ticketId]: newStatus,
        }));
    };

    return (
        <div>
            <h2>View Tickets</h2>
            <table border="1">
                <thead>
                    <tr>
                        <th>Ticket ID</th>
                        <th>Title</th>
                        <th>Description</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {tickets.map((ticket) => (
                        <tr key={ticket.id}>
                            <td>{ticket.id}</td>
                            <td>{ticket.title}</td>
                            <td>{ticket.description}</td>
                            <td>{ticket.priority}</td>
                            <td>{ticket.status}</td>
                            <td>
                                <select
                                    value={status[ticket.id] || ticket.status}
                                    onChange={(e) =>
                                        handleStatusChange(ticket.id, e.target.value)
                                    }
                                >
                                    <option value="Open">Open</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Resolved">Resolved</option>
                                    <option value="Closed">Closed</option>
                                </select>
                                <button onClick={() => updateTicketStatus(ticket.id)}>
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

export default ViewTickets;
