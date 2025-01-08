import React, { useEffect, useState } from "react";
import axios from "axios";

const ViewUsers = ({ token }) => {
    const [users, setUsers] = useState([]);
    const [editUser, setEditUser] = useState({});
    const [message, setMessage] = useState("");

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

    const handleEdit = async (userId) => {
        try {
            const response = await axios.patch(
                `/users/${userId}`,
                { username: editUser.username },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            setMessage(response.data.message);
            // Update the user in the list
            setUsers((prev) =>
                prev.map((user) =>
                    user.user_id === userId
                        ? { ...user, username: editUser.username }
                        : user
                )
            );
            setEditUser({});
        } catch (error) {
            console.error("Failed to edit user", error);
        }
    };

    const handleDelete = async (userId) => {
        try {
            const response = await axios.delete(`/users/${userId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setMessage(response.data.message);
            // Remove the user from the list
            setUsers((prev) => prev.filter((user) => user.user_id !== userId));
        } catch (error) {
            console.error("Failed to delete user", error);
        }
    };

    return (
        <div>
            <h2>View Users</h2>
            <table border="1">
                <thead>
                    <tr>
                        <th>User ID</th>
                        <th>Username</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((user) => (
                        <tr key={user.user_id}>
                            <td>{user.user_id}</td>
                            <td>
                                {editUser.user_id === user.user_id ? (
                                    <input
                                        type="text"
                                        defaultValue={user.username}
                                        onChange={(e) =>
                                            setEditUser({
                                                ...editUser,
                                                username: e.target.value,
                                            })
                                        }
                                    />
                                ) : (
                                    user.username
                                )}
                            </td>
                            <td>
                                {editUser.user_id === user.user_id ? (
                                    <button
                                        onClick={() => handleEdit(user.user_id)}
                                    >
                                        Save
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setEditUser(user)}
                                    >
                                        Edit
                                    </button>
                                )}
                                <button
                                    onClick={() => handleDelete(user.user_id)}
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

export default ViewUsers;
