import React, { useMemo, useState } from "react";
import { useTable, usePagination, useGlobalFilter } from "react-table";

const DataTable = ({ columns, data, theme = "light", pagination = {} }) => {
    // Add a search filter input state
    const [filterInput, setFilterInput] = React.useState("");
    
    // Use memoized data to prevent unnecessary re-renders
    const memoizedData = useMemo(() => data, [data]);
    const memoizedColumns = useMemo(() => columns, [columns]);
    
    // Update the global filter when the filter input changes
    const handleFilterChange = e => {
        const value = e.target.value || "";
        setFilterInput(value);
        setGlobalFilter(value);
    };
    
    // Determine if we're using server-side pagination
    const useServerPagination = pagination.useServerPagination;
    
    // Initial state for react-table
    const initialState = {
        pageIndex: (pagination.currentPage || 1) - 1, // react-table uses 0-indexed pages
        pageSize: 25, // Default page size
    };
    
    const {
        getTableProps,
        getTableBodyProps,
        headerGroups,
        page,
        prepareRow,
        canPreviousPage,
        canNextPage,
        pageOptions,
        gotoPage,
        nextPage,
        previousPage,
        setPageSize,
        setGlobalFilter,
        state: { pageIndex, pageSize },
    } = useTable(
        {
            columns: memoizedColumns,
            data: memoizedData,
            initialState,
            // Disable react-table's built-in pagination if using server-side
            manualPagination: useServerPagination,
            // If using server-side pagination, tell react-table how many pages there are
            pageCount: useServerPagination ? pagination.totalPages : undefined,
        },
        useGlobalFilter,
        usePagination
    );

    // Handle page change - either use server-side or client-side pagination
    const handlePageChange = (newPage) => {
        if (useServerPagination && pagination.onPageChange) {
            // For server-side pagination, call the provided callback
            pagination.onPageChange(newPage);
        } else {
            // For client-side pagination, use react-table's built-in pagination
            gotoPage(newPage - 1); // react-table uses 0-indexed pages
        }
    };

    // Tailwind classes based on theme
    const tableClass =
        theme === "dark"
            ? "text-white bg-gray-800 border-gray-600"
            : "text-gray-700 bg-white border-gray-200";
    const headerClass =
        theme === "dark" ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600";

    return (
        <div className="overflow-x-auto">
            {/* Search Filter */}
            <div className="mb-4">
                <input
                    value={filterInput}
                    onChange={handleFilterChange}
                    placeholder="Search..."
                    className="px-4 py-2 border rounded w-full max-w-xs"
                />
            </div>
            
            {/* Page Size Selector - Only show if not using server pagination */}
            {!useServerPagination && (
                <div className="mb-4 flex items-center">
                    <span className="mr-2">Show</span>
                    <select
                        value={pageSize}
                        onChange={e => {
                            setPageSize(Number(e.target.value));
                        }}
                        className="px-2 py-1 border rounded"
                    >
                        {[25, 50, 100, 250].map(size => (
                            <option key={size} value={size}>
                                {size}
                            </option>
                        ))}
                    </select>
                    <span className="ml-2">entries</span>
                </div>
            )}
            
            <div className="border-4 border-gray-300 rounded-lg overflow-hidden shadow-lg">
                <table
                    {...getTableProps()}
                    className={`min-w-full border-collapse ${tableClass}`}
                    style={{ borderSpacing: 0 }}
                >
                    {/* Table Header */}
                    <thead className={`${headerClass} border-b-2 border-gray-300`}>
                    {headerGroups.map((headerGroup, headerIndex) => (
                        <tr {...headerGroup.getHeaderGroupProps()} key={`headerGroup-${headerIndex}`}>
                            {headerGroup.headers.map((column, colIndex) => {
                                const { key, ...rest } = column.getHeaderProps();
                                return (
                                    <th
                                        key={key || `column-${colIndex}`}
                                        {...rest}
                                        className="px-4 py-3 text-left font-semibold border-r border-gray-300"
                                        style={{ 
                                            borderRight: colIndex === headerGroup.headers.length - 1 ? 'none' : '1px solid #d1d5db'
                                        }}
                                    >
                                        {column.render("Header")}
                                    </th>
                                );
                            })}
                        </tr>
                    ))}
                    </thead>

                    {/* Table Body */}
                    <tbody {...getTableBodyProps()}>
                    {page.map((row, rowIndex) => {
                        prepareRow(row);
                        return (
                            <tr
                                {...row.getRowProps()}
                                key={`row-${rowIndex}`}
                                className="hover:bg-gray-50 border-b border-gray-300"
                            >
                                {row.cells.map((cell, cellIndex) => {
                                    const { key, ...rest } = cell.getCellProps();
                                    return (
                                        <td
                                            key={key || `cell-${rowIndex}-${cellIndex}`}
                                            {...rest}
                                            className="px-4 py-3 border-r border-gray-300"
                                            style={{ 
                                                borderRight: cellIndex === row.cells.length - 1 ? 'none' : '1px solid #d1d5db'
                                            }}
                                        >
                                            {cell.render("Cell")}
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            </div>

            {/* Pagination - Only show if not using custom pagination in parent */}
            {!useServerPagination && (
                <div className="mt-4 flex items-center justify-between">
                    <button
                        className="px-4 py-2 border rounded disabled:opacity-50"
                        onClick={() => previousPage()}
                        disabled={!canPreviousPage}
                    >
                        Previous
                    </button>
                    <span>
                        Page{" "}
                        <strong>
                            {pageIndex + 1} of {pageOptions.length}
                        </strong>
                    </span>
                    <button
                        className="px-4 py-2 border rounded disabled:opacity-50"
                        onClick={() => nextPage()}
                        disabled={!canNextPage}
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
};

export default DataTable;
