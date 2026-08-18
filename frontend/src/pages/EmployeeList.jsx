import { useEffect, useState } from "react";
import { FaDownload } from "react-icons/fa6";
import { Users } from "lucide-react";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import SpinnerButton from "@/components/ui/spinner-button";

import PaginationTable from "../components/PaginationTable";
import Spinner from "../components/Spinner";
import apiService from "../utils/apiService";
import toaster from "../utils/toaster";
import { validateEmployeeCode, capitalizeWords } from "../utils/helperFunctions";

const columns = [
    { key: "employeeCode", header: "Employee Code" },
    { key: "employeeName", header: "Name" },
    { key: "status", header: "Status" },
    { key: "action", header: "Action", adminOnly: true },
];

const EmployeeList = () => {
    const [search, setSearch] = useState(""); // used for actual fetch
    const [searchInput, setSearchInput] = useState(""); // input field value
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editForm, setEditForm] = useState({
        id: "",
        employeeCode: "",
        employeeName: "",
        status: "Active",
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(6);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [items, setItems] = useState([]);
    const [loadingStates, setLoadingStates] = useState({
        isBackuping: false,
    });

    useEffect(() => {
        setLoading(true);
        apiService
            .get("/employees", {
                params: {
                    page: currentPage,
                    size: pageSize,
                    search: search || undefined,
                },
            })
            .then((res) => {
                const data = res.data;
                setItems(
                    data.items.map((row) => ({
                        ...row,
                        employeeCode: row.emp_code,
                        employeeName: row.name,
                    }))
                );
                setTotalPages(data.totalPages);
                setTotalItems(data.totalItems || 0);
                setLoading(false);
            })
            .catch(() => {
                setItems([]);
                setTotalPages(1);
                setLoading(false);
            });
    }, [currentPage, pageSize, search]);

    const handleEditClick = (employee) => {
        setEditForm({
            id: employee.id,
            employeeCode: employee.employeeCode,
            employeeName: employee.employeeName,
            status: employee.status,
        });
        setDialogOpen(true);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setEditForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleStatusChange = (value) => {
        setEditForm((prev) => ({ ...prev, status: value }));
    };

    const handleSave = async () => {
        if (!validateEmployeeCode(editForm.employeeCode)) {
            toaster(
                "error",
                "Invalid employee code. It should be 2 uppercase letters followed by 6-9 digits."
            );
            return;
        }
        try {
            setLoading(true);
            await apiService.post(`/employees/update/${editForm.id}`, {
                emp_code: editForm.employeeCode,
                name: editForm.employeeName,
                status: editForm.status,
            });
            setDialogOpen(false);
            try {
                const res = await apiService.get("/employees", {
                    params: {
                        page: currentPage,
                        size: pageSize,
                        search: search || undefined,
                    },
                });
                const data = res.data;
                setItems(
                    data.items.map((row) => ({
                        ...row,
                        employeeCode: row.emp_code,
                        employeeName: row.name,
                    }))
                );
                setTotalPages(data.totalPages);
                setTotalItems(data.totalItems || 0);
                toaster("success", "Employee updated successfully");
            } catch (fetchError) {
                setItems([]);
                setTotalPages(1);
            }
            setLoading(false);
        } catch (error) {
            setLoading(false);
            if (error.response && error.response.data && error.response.data.message) {
                toaster("error", error.response.data.message);
            } else {
                toaster("error", "Failed to update employee.");
            }
        }
    };

    const tableData = items.map((row) => ({
        ...row,
        status: capitalizeWords(row.status),
        action: (
            <Button
                variant="outline"
                className="cursor-pointer"
                size="sm"
                onClick={() => handleEditClick(row)}
            >
                Edit
            </Button>
        ),
    }));

    const handleSearch = () => {
        setCurrentPage(1);
        setSearch(searchInput);
    };

    const handleBackup = async () => {
        setLoadingStates((prev) => ({ ...prev, isBackuping: true }));
        try {
            await apiService.downloadFile("/employees/backup");
        } catch (error) {
            console.error("Backup failed:", error);
            toaster("error", "Failed to create backup.");
        } finally {
            setLoadingStates((prev) => ({ ...prev, isBackuping: false }));
        }
    };

    return (
        <div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400 flex items-center gap-2">
                        <Users className="h-6 w-6 text-blue-600 dark:text-blue-500" />
                        Employee List
                    </h2>
                </div>
                <SpinnerButton
                    loading={loadingStates.isBackuping}
                    loadingText="Please Wait..."
                    disabled={loadingStates.isBackuping}
                    className="cursor-pointer rounded-lg bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:text-neutral-900 dark:hover:bg-blue-400 border-0 shadow-sm transition-all duration-150 py-2 px-4 flex items-center gap-2 font-medium"
                    onClick={handleBackup}
                >
                    <FaDownload className="size-4" /> Download CSV
                </SpinnerButton>
            </div>
            <div className="mb-6 flex justify-end gap-2">
                <Input
                    type="text"
                    placeholder="Search by code, name, or status..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="w-full bg-white"
                />
                <Button onClick={handleSearch} className="cursor-pointer">
                    Search
                </Button>
            </div>
            {loading ? (
                <div className="flex justify-center items-center min-h-[200px]">
                    <Spinner />
                </div>
            ) : (
                <PaginationTable
                    data={tableData}
                    columns={columns}
                    currentPage={currentPage}
                    pageSize={pageSize}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalItems={totalItems}
                />
            )}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-[90vw] w-[500px]" unbounded>
                    <DialogHeader>
                        <DialogTitle>Edit Employee</DialogTitle>
                    </DialogHeader>
                    <form className="space-y-4">
                        <div>
                            <label className="block mb-1 text-sm font-medium">Employee Code</label>
                            <Input
                                name="employeeCode"
                                value={editForm.employeeCode}
                                disabled={true}
                                className="w-full"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-medium">Name</label>
                            <Input
                                name="employeeName"
                                value={editForm.employeeName}
                                onChange={handleInputChange}
                                className="w-full"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-medium">Status</label>
                            <Select value={editForm.status} onValueChange={handleStatusChange}>
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </form>
                    <DialogFooter>
                        <Button
                            className="cursor-pointer"
                            onClick={() => setDialogOpen(false)}
                            type="button"
                            variant="outline"
                        >
                            Close
                        </Button>
                        <Button type="button" className="cursor-pointer" onClick={handleSave}>
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default EmployeeList;
