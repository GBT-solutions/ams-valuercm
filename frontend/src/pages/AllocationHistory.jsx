import { useState, useEffect } from "react";
import { VscDebugRestart } from "react-icons/vsc";
import PaginationTable from "../components/PaginationTable";
import apiService from "../utils/apiService";
import { Input } from "../components/ui/input";
import { formatDateTime } from "../utils/helperFunctions";
import { Button } from "../components/ui/button";
import { FaSearch } from "react-icons/fa";
import { History } from "lucide-react";

const columns = [
    { key: "asset_id", header: "Asset ID" },
    { key: "serial", header: "Serial" },
    { key: "model_no", header: "Model No" },
    { key: "emp_code", header: "Employee Code" },
    { key: "emp_name", header: "Employee Name" },
    { key: "assigned_at", header: "Tagged At" },
    { key: "detagged_at", header: "Detagged At" },
];

const AllocationHistory = () => {
    const [tableData, setTableData] = useState([]);
    const [fetchedData, setFetchedData] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(9);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [search, setSearch] = useState(""); // used for actual fetch
    const [searchInput, setSearchInput] = useState(""); // input field value

    useEffect(() => {
        const fetchAllocationHistory = async () => {
            try {
                const response = await apiService.get("/assets/allocation-history", {
                    params: {
                        page: currentPage,
                        size: pageSize,
                        search: search,
                    },
                });
                setFetchedData(response.data.items);
                setTotalPages(response.data.totalPages);
                setTotalItems(response.data.totalItems || 0);
            } catch (error) {
                console.error("Error fetching allocation history:", error);
            }
        };
        fetchAllocationHistory();
    }, [currentPage, pageSize, search]);

    useEffect(() => {
        const t = fetchedData.map((data) => {
            return {
                ...data,
                asset_id: (
                    <div className="flex gap-2 items-center">
                        <div
                            className={
                                "w-2 h-2 rounded-full " +
                                (data.asset_status == "active" ? "bg-green-500" : "bg-red-500")
                            }
                        />
                        <p>{data.asset_id}</p>
                    </div>
                ),
                emp_code: (
                    <div className="flex gap-2 items-center">
                        <div
                            className={
                                "w-2 h-2 rounded-full " +
                                (data.employee_status == "active" ? "bg-green-500" : "bg-red-500")
                            }
                        />
                        <p>{data.emp_code}</p>
                    </div>
                ),
                assigned_at: formatDateTime(new Date(data.assigned_at)),
                detagged_at: formatDateTime(new Date(data.detagged_at)),
            };
        });
        setTableData(t);
    }, [fetchedData]);

    const handleSearch = () => {
        setSearch(searchInput);
        setCurrentPage(1);
    };

    return (
        <div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400 flex items-center gap-2">
                        <History className="h-6 w-6 text-blue-600 dark:text-blue-500" />
                        Allocation History
                    </h2>
                </div>
            </div>
            <div className="flex items-center gap-2 mb-2">
                <Input
                    type="text"
                    placeholder="Search"
                    className="bg-white flex-1"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                />
                <Button
                    size="icon"
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => {
                        setSearchInput("");
                        setSearch("");
                        setCurrentPage(1);
                    }}
                >
                    <VscDebugRestart />
                </Button>
                <Button
                    className="cursor-pointer"
                    onClick={handleSearch}
                    disabled={search === searchInput || searchInput.trim() === ""}
                >
                    <FaSearch />
                    Search
                </Button>
            </div>
            <PaginationTable
                data={tableData}
                columns={columns}
                currentPage={currentPage}
                pageSize={pageSize}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={totalItems}
            />
        </div>
    );
};

export default AllocationHistory;
