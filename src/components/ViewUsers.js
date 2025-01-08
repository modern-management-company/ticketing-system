import React, { useEffect, useState } from "react";
import axios from "axios";

const ViewUsers = ({ token }) => {
    const [users, setUsers] = useState([]);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await axios.get("/users", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setUsers(response.data.users);
            } catch (error) {
                console.error("Failed to fetch users", error);
            }
        };

        fetchUsers();
    }, [token]);

    return (
        <div>
            <h2>View Users</h2>
            <table border="1">
                <thead>
                    <tr>
                        <th>User ID</th>
                        <th>Username</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((user) => (
                        <tr key={user.user_id}>
                            <td>{user.user_id}</td>
                            <td>{user.username}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ViewUsers;
