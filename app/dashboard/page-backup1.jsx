'use client';
import React, { useEffect, useState } from "react";
import axios from "axios";
import DataTable from "../../components/common/DataTable";

const HomePage = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    const columns = React.useMemo(
        () => [
            { Header: "ID", accessor: "id" },
            { Header: "Name", accessor: "name" },
            { Header: "Email", accessor: "email" },
        ],
        []
    );

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get("https://jsonplaceholder.typicode.com/users");
                setData(response.data);
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) return <div>Loading...</div>;

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">DataTable Example</h1>
            <DataTable columns={columns} data={data} />
        </div>
    );
};

export default HomePage;
