import React, { useEffect, useState } from "react";
import axios from "axios";

const ViewProperties = ({ token }) => {
    const [properties, setProperties] = useState([]);
    const [editProperty, setEditProperty] = useState({});
    const [message, setMessage] = useState("");

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

    const handleEdit = async (propertyId) => {
        try {
            const response = await axios.patch(
                `/properties/${propertyId}`,
                { name: editProperty.name, address: editProperty.address },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setMessage(response.data.message);
            setProperties((prev) =>
                prev.map((property) =>
                    property.property_id === propertyId
                        ? { ...property, name: editProperty.name, address: editProperty.address }
                        : property
                )
            );
            setEditProperty({});
        } catch (error) {
            console.error("Failed to edit property", error);
        }
    };

    const handleDelete = async (propertyId) => {
        try {
            const response = await axios.delete(`/properties/${propertyId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setMessage(response.data.message);
            setProperties((prev) =>
                prev.filter((property) => property.property_id !== propertyId)
            );
        } catch (error) {
            console.error("Failed to delete property", error);
        }
    };

    return (
        <div>
            <h2>View Properties</h2>
            <table border="1">
                <thead>
                    <tr>
                        <th>Property ID</th>
                        <th>Name</th>
                        <th>Address</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {properties.map((property) => (
                        <tr key={property.property_id}>
                            <td>{property.property_id}</td>
                            <td>
                                {editProperty.property_id === property.property_id ? (
                                    <input
                                        type="text"
                                        defaultValue={property.name}
                                        onChange={(e) =>
                                            setEditProperty({
                                                ...editProperty,
                                                name: e.target.value,
                                            })
                                        }
                                    />
                                ) : (
                                    property.name
                                )}
                            </td>
                            <td>
                                {editProperty.property_id === property.property_id ? (
                                    <input
                                        type="text"
                                        defaultValue={property.address}
                                        onChange={(e) =>
                                            setEditProperty({
                                                ...editProperty,
                                                address: e.target.value,
                                            })
                                        }
                                    />
                                ) : (
                                    property.address
                                )}
                            </td>
                            <td>
                                {editProperty.property_id === property.property_id ? (
                                    <button onClick={() => handleEdit(property.property_id)}>
                                        Save
                                    </button>
                                ) : (
                                    <button onClick={() => setEditProperty(property)}>
                                        Edit
                                    </button>
                                )}
                                <button onClick={() => handleDelete(property.property_id)}>
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

export default ViewProperties;
