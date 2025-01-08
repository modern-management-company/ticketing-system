import React, { useEffect, useState } from "react";
import axios from "axios";

const ViewRooms = ({ token }) => {
    const [properties, setProperties] = useState([]);
    const [selectedProperty, setSelectedProperty] = useState("");
    const [rooms, setRooms] = useState([]);
    const [editRoom, setEditRoom] = useState({});
    const [message, setMessage] = useState("");

    useEffect(() => {
        // Fetch properties
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
        if (propertyId) fetchRooms(propertyId);
        else setRooms([]);
    };

    const handleEdit = async (roomId) => {
        try {
            const response = await axios.patch(
                `/rooms/${roomId}`,
                { name: editRoom.name },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setMessage(response.data.message);
            setRooms((prev) =>
                prev.map((room) =>
                    room.room_id === roomId
                        ? { ...room, name: editRoom.name }
                        : room
                )
            );
            setEditRoom({});
        } catch (error) {
            console.error("Failed to edit room", error);
        }
    };

    const handleDelete = async (roomId) => {
        try {
            const response = await axios.delete(`/rooms/${roomId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setMessage(response.data.message);
            setRooms((prev) => prev.filter((room) => room.room_id !== roomId));
        } catch (error) {
            console.error("Failed to delete room", error);
        }
    };

    return (
        <div>
            <h2>View Rooms</h2>
            <div>
                <label htmlFor="property-select">Select Property: </label>
                <select
                    id="property-select"
                    value={selectedProperty}
                    onChange={handlePropertyChange}
                >
                    <option value="">--Select a Property--</option>
                    {properties.map((property) => (
                        <option
                            key={property.property_id}
                            value={property.property_id}
                        >
                            {property.name}
                        </option>
                    ))}
                </select>
            </div>
            {rooms.length > 0 ? (
                <table border="1">
                    <thead>
                        <tr>
                            <th>Room ID</th>
                            <th>Name</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rooms.map((room) => (
                            <tr key={room.room_id}>
                                <td>{room.room_id}</td>
                                <td>
                                    {editRoom.room_id === room.room_id ? (
                                        <input
                                            type="text"
                                            defaultValue={room.name}
                                            onChange={(e) =>
                                                setEditRoom({
                                                    ...editRoom,
                                                    name: e.target.value,
                                                })
                                            }
                                        />
                                    ) : (
                                        room.name
                                    )}
                                </td>
                                <td>
                                    {editRoom.room_id === room.room_id ? (
                                        <button
                                            onClick={() => handleEdit(room.room_id)}
                                        >
                                            Save
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setEditRoom(room)}
                                        >
                                            Edit
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(room.room_id)}
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p>Select a property to view rooms.</p>
            )}
            {message && <p>{message}</p>}
        </div>
    );
};

export default ViewRooms;