import React, { useState } from "react";
import axios from "axios";

const PropertyForm = ({ token }) => {
    const [name, setName] = useState("");
    const [address, setAddress] = useState("");
    const [message, setMessage] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post(
                "/properties",
                { name, address },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setMessage("Property created successfully!");
        } catch (error) {
            console.error(error);
            setMessage("Failed to create property.");
        }
    };

    return (
        <div>
            <h2>Add Property</h2>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="Property Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
                <input
                    type="text"
                    placeholder="Address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                />
                <button type="submit">Add Property</button>
            </form>
            {message && <p>{message}</p>}
        </div>
    );
};

export default PropertyForm;
