import React, { useEffect, useState } from "react";
import axios from "axios";

const ViewTickets = ({ token }) => {
    const [tickets, setTickets] = useState([]);
    const [editTicket, setEditTicket] = useState({});
    const [message, setMessage] = useState("");

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

    const handleEdit = async (ticketId) => {
        try {
            const response = await axios.patch(
                `/tickets/${ticketId}`,
                { title: editTicket.title, status: editTicket.status },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setMessage(response.data.message);
            setTickets((prev) =>
                prev.map((ticket) =>
                    ticket.id === ticketId
                        ? { ...ticket, title: editTicket.title, status: editTicket.status }
                        : ticket
                )
            );
            setEditTicket({});
        } catch (error) {
            console.error("Failed to edit ticket", error);
        }
    };

    const handleDelete = async (ticketId) => {
        try {
            const response = await axios.delete(`/tickets/${ticketId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setMessage(response.data.message);
            setTickets((prev) => prev.filter((ticket) => ticket.id !== ticketId));
        } catch (error) {
            console.error("Failed to delete ticket", error);
        }
    };

    const handleStatusChange = (ticketId, newStatus) => {
        setTickets((prev) =>
            prev.map((ticket) =>
                ticket.id === ticketId ? { ...ticket, status: newStatus } : ticket
            )
        );
        setEditTicket((prev) => ({ ...prev, id: ticketId, status: newStatus }));
    };

    return (
        <div>
            <h2>View Tickets</h2>
            <table border="1">
                <thead>
                    <tr>
                        <th>Ticket ID</th>
                        <th>Title</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {tickets.map((ticket) => (
                        <tr key={ticket.id}>
                            <td>{ticket.id}</td>
                            <td>
                                {editTicket.id === ticket.id ? (
                                    <input
                                        type="text"
                                        defaultValue={ticket.title}
                                        onChange={(e) =>
                                            setEditTicket({
                                                ...editTicket,
                                                title: e.target.value,
                                            })
                                        }
                                    />
                                ) : (
                                    ticket.title
                                )}
                            </td>
                            <td>
                                <select
                                    value={
                                        editTicket.id === ticket.id
                                            ? editTicket.status
                                            : ticket.status
                                    }
                                    onChange={(e) =>
                                        handleStatusChange(ticket.id, e.target.value)
                                    }
                                >
                                    <option value="Pending">Pending</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Completed">Completed</option>
                                </select>
                            </td>
                            <td>
                                {editTicket.id === ticket.id ? (
                                    <button
                                        onClick={() => handleEdit(ticket.id)}
                                    >
                                        Save
                                    </button>
                                ) : (
                                    <button
                                        onClick={() =>
                                            setEditTicket({
                                                id: ticket.id,
                                                title: ticket.title,
                                                status: ticket.status,
                                            })
                                        }
                                    >
                                        Edit
                                    </button>
                                )}
                                <button
                                    onClick={() => handleDelete(ticket.id)}
                                >
                                    Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {message && <p>{message}</p>}
        </div>
    );
};

export default ViewTickets;
