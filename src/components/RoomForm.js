import React, { useState, useEffect } from "react";
import axios from "axios";

const RoomForm = ({ token }) => {
    const [properties, setProperties] = useState([]);
    const [selectedProperty, setSelectedProperty] = useState("");
    const [roomName, setRoomName] = useState("");
    const [message, setMessage] = useState("");

    useEffect(() => {
        const fetchProperties = async () => {
            try {
                const response = await axios.get("/properties", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setProperties(response.data.properties);
            } catch (error) {
                console.error(error);
            }
        };
        fetchProperties();
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post(
                `/properties/${selectedProperty}/rooms`,
                { name: roomName },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setMessage("Room created successfully!");
        } catch (error) {
            console.error(error);
            setMessage("Failed to create room.");
        }
    };

    return (
        <div>
            <h2>Add Room</h2>
            <form onSubmit={handleSubmit}>
                <select onChange={(e) => setSelectedProperty(e.target.value)}>
                    <option value="">Select Property</option>
                    {properties.map((property) => (
                        <option key={property.property_id} value={property.property_id}>
                            {property.name}
                        </option>
                    ))}
                </select>
                <input
                    type="text"
                    placeholder="Room Name"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                />
                <button type="submit">Add Room</button>
            </form>
            {message && <p>{message}</p>}
        </div>
    );
};

export default RoomForm;
