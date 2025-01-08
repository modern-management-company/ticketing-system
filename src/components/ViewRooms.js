import React, { useEffect, useState } from "react";
import axios from "axios";

const ViewRooms = ({ token }) => {
    const [properties, setProperties] = useState([]);
    const [selectedProperty, setSelectedProperty] = useState("");
    const [rooms, setRooms] = useState([]);

    useEffect(() => {
        const fetchProperties = async () => {
            try {
                const response = await axios.get("/properties", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setProperties(response.data.properties);
            } catch (error) {
                console.error("Failed to fetch properties", error);
            }
        };

        fetchProperties();
    }, [token]);

    const fetchRooms = async (propertyId) => {
        try {
            const response = await axios.get(`/properties/${propertyId}/rooms`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setRooms(response.data.rooms);
        } catch (error) {
            console.error("Failed to fetch rooms", error);
        }
    };

    const handlePropertyChange = (e) => {
        const propertyId = e.target.value;
        setSelectedProperty(propertyId);
        if (propertyId) {
            fetchRooms(propertyId);
        } else {
            setRooms([]);
        }
    };

    return (
        <div>
            <h2>View Rooms</h2>
            <div>
                <label>Select Property: </label>
                <select value={selectedProperty} onChange={handlePropertyChange}>
                    <option value="">--Select--</option>
                    {properties.map((property) => (
                        <option key={property.property_id} value={property.property_id}>
                            {property.name}
                        </option>
                    ))}
                </select>
            </div>
            {rooms.length > 0 && (
                <table border="1">
                    <thead>
                        <tr>
                            <th>Room ID</th>
                            <th>Name</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rooms.map((room) => (
                            <tr key={room.room_id}>
                                <td>{room.room_id}</td>
                                <td>{room.name}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default ViewRooms;
