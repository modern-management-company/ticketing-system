import React, { useState, useEffect } from "react";
import axios from "axios";

const CreateTicket = ({ token }) => {
    const [categories] = useState(["Maintenance", "Cleaning", "Other"]);
    const [properties, setProperties] = useState([]);
    const [selectedProperty, setSelectedProperty] = useState("");
    const [rooms, setRooms] = useState([]);
    const [selectedRoom, setSelectedRoom] = useState("");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [priority, setPriority] = useState("");
    const [category, setCategory] = useState(categories[0]);
    const [message, setMessage] = useState("");

    // Fetch all properties
    useEffect(() => {
        const fetchProperties = async () => {
            try {
                const response = await axios.get("/properties", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setProperties(response.data.properties);
            } catch (error) {
                console.error("Failed to fetch properties:", error);
            }
        };
        fetchProperties();
    }, [token]);

    // Fetch rooms for a selected property
    const fetchRooms = async (propertyId) => {
        try {
            const response = await axios.get(`/properties/${propertyId}/rooms`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setRooms(response.data.rooms);
        } catch (error) {
            console.error("Failed to fetch rooms:", error);
        }
    };

    const handlePropertyChange = (e) => {
        const propertyId = e.target.value;
        setSelectedProperty(propertyId);
        setRooms([]); // Clear rooms when changing properties
        if (propertyId) {
            fetchRooms(propertyId);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedProperty || !selectedRoom || !title || !description || !priority) {
            setMessage("Please fill in all fields.");
            return;
        }
        try {
            const response = await axios.post(
                "/tickets",
                {
                    title,
                    description,
                    priority,
                    category,
                    property_id: selectedProperty,
                    room_id: selectedRoom,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setMessage("Ticket created successfully!");
            setTitle("");
            setDescription("");
            setPriority("");
            setSelectedProperty("");
            setSelectedRoom("");
            setRooms([]);
        } catch (error) {
            console.error("Failed to create ticket:", error);
            setMessage("Failed to create ticket.");
        }
    };

    return (
        <div>
            <h2>Create Ticket</h2>
            <form onSubmit={handleSubmit}>
                {/* Select Property */}
                <div>
                    <label>Property:</label>
                    <select value={selectedProperty} onChange={handlePropertyChange}>
                        <option value="">Select Property</option>
                        {properties.map((property) => (
                            <option key={property.property_id} value={property.property_id}>
                                {property.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Select Room */}
                <div>
                    <label>Room:</label>
                    <select
                        value={selectedRoom}
                        onChange={(e) => setSelectedRoom(e.target.value)}
                        disabled={!rooms.length}
                    >
                        <option value="">Select Room</option>
                        {rooms.map((room) => (
                            <option key={room.room_id} value={room.room_id}>
                                {room.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Ticket Title */}
                <div>
                    <label>Title:</label>
                    <input
                        type="text"
                        placeholder="Ticket Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>

                {/* Description */}
                <div>
                    <label>Description:</label>
                    <textarea
                        placeholder="Description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>

                {/* Priority */}
                <div>
                    <label>Priority:</label>
                    <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                        <option value="">Select Priority</option>
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                    </select>
                </div>

                {/* Category */}
                <div>
                    <label>Category:</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)}>
                        {categories.map((cat, index) => (
                            <option key={index} value={cat}>
                                {cat}
                            </option>
                        ))}
                    </select>
                </div>

                <button type="submit">Create Ticket</button>
            </form>
            {message && <p>{message}</p>}
        </div>
    );
};

export default CreateTicket;
