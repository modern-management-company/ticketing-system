import React, { useEffect, useState } from "react";
import axios from "axios";

const ViewProperties = ({ token }) => {
    const [properties, setProperties] = useState([]);

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

    return (
        <div>
            <h2>View Properties</h2>
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
        </div>
    );
};

export default ViewProperties;
