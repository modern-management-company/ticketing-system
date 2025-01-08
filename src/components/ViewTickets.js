import React, { useEffect, useState } from "react";
import axios from "axios";

const ViewTickets = ({ token }) => {
    const [tickets, setTickets] = useState([]);

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

    return (
        <div>
            <h2>View Tickets</h2>
            <table border="1">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Title</th>
                        <th>Description</th>
                        <th>Priority</th>
                        <th>Status</th>
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
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ViewTickets;
