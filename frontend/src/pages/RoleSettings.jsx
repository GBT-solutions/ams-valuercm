import { useEffect, useState } from "react";
import { UserCog } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogFooter,
    DialogDescription,
    DialogHeader,
} from "@/components/ui/dialog";
import SpinnerButton from "../components/ui/spinner-button";
import { Chip } from "../components/ui/chip";

import apiService from "../utils/apiService";
import PaginationTable from "../components/PaginationTable";
import {
    capitalizeWords,
    isStrongPassword,
    validateContact,
    validateEmail,
    validateUsername,
} from "../utils/helperFunctions";
import toaster from "../utils/toaster";

const columns = [
    { key: "name", header: "Name" },
    { key: "username", header: "Username" },
    { key: "contact", header: "Contact" },
    { key: "email", header: "Email" },
    { key: "role", header: "Role" },
    { key: "action", header: "Action" },
];

const RoleSettings = () => {
    const [fetchedData, setFetchedData] = useState([]);
    const [loading, setLoading] = useState({ table: false, update: false });
    const [tableData, setTableData] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [dialogContent, setDialogContent] = useState({});
    const [dialogOpen, setDialogOpen] = useState(false);

    const fetchUsers = async () => {
        setLoading((prev) => ({ ...prev, table: true }));
        try {
            const response = await apiService.get("/users", {
                params: { page: currentPage, pageSize: 5 },
            });
            setFetchedData(response.data);
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading((prev) => ({ ...prev, table: false }));
        }
    };
    useEffect(() => {
        fetchUsers();
    }, [currentPage]);

    useEffect(() => {
        const t = fetchedData.items?.map((item) => ({
            ...item,
            role: capitalizeWords(item.role),
            username: item.username.toLowerCase(),
            action: (
                <div>
                    <Button
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => {
                            setDialogContent(item);
                            setDialogOpen(true);
                        }}
                    >
                        Edit
                    </Button>
                </div>
            ),
        }));
        setTableData(t || []);
    }, [fetchedData]);

    const handleUpdate = async () => {
        if (
            !dialogContent.name ||
            !dialogContent.username ||
            !dialogContent.contact
        ) {
            toaster("error", "Please fill all required fields");
            return;
        }
        if (!validateUsername(dialogContent.username)) {
            toaster(
                "error",
                "Username can only contain lowercase letters, numbers, and underscores"
            );
            return;
        }
        if (!validateContact(dialogContent.contact)) {
            toaster("error", "Contact must be a 10-digit number");
            return;
        }
        if (!validateEmail(dialogContent.email)) {
            toaster("error", "Invalid email format");
            return;
        }
        if (dialogContent.password) {
            if (!isStrongPassword(dialogContent.password)) {
                const setError =
                    "Password must be at least 8 characters, include uppercase, lowercase, number, and special character.";
                toaster("error", setError);
                return;
            }
        }
        setLoading((prev) => ({ ...prev, update: true }));
        try {
            await apiService.patch(`/users/${dialogContent.id}`, {
                name: dialogContent.name,
                username: dialogContent.username.toLowerCase(),
                contact: dialogContent.contact,
                email: dialogContent.email,
                password: dialogContent.password || undefined,
            });
            toaster("success", "User updated successfully");
            setDialogOpen(false);
            fetchUsers();
        } catch (error) {
            toaster("error", "Failed to update user");
        }
        setLoading((prev) => ({ ...prev, update: false }));
    };

    return (
        <div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400 flex items-center gap-2">
                        <UserCog className="h-6 w-6 text-blue-600 dark:text-blue-500" />
                        Users List
                    </h2>
                </div>
            </div>
            <PaginationTable
                data={tableData}
                columns={columns}
                currentPage={fetchedData.currentPage || 1}
                pageSize={fetchedData.pageSize || 5}
                totalPages={fetchedData.totalPages || 0}
                onPageChange={setCurrentPage}
                totalItems={fetchedData.totalItems}
                showPagination={false}
            />
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent
                    className="max-w-[90vw] w-[600px]  max-h-[90vh] overflow-y-auto"
                    unbounded={true}
                    onPointerDownOutside={() => setDialogOpen(false)}
                >
                    <DialogHeader className="text-left">
                        <DialogTitle className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                            <span>Edit User</span>
                            {dialogContent.role && (
                                <Chip
                                    variant={dialogContent.role.toLowerCase() === "admin" ? "success" : "primary"}
                                    className={`capitalize text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                                        dialogContent.role.toLowerCase() === "admin"
                                            ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200/60 dark:border-green-900/30"
                                            : "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200/60 dark:border-blue-900/30"
                                    }`}
                                >
                                    {dialogContent.role}
                                </Chip>
                            )}
                        </DialogTitle>
                        <DialogDescription className="hidden" />
                    </DialogHeader>
                    <form className="space-y-2 text-left">
                        <div>
                            <label className="block mb-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                Name <span className="text-red-500">*</span>
                            </label>
                            <Input
                                className="w-full bg-white dark:bg-card border border-neutral-200 dark:border-neutral-800 rounded-lg focus:border-blue-500 h-10 transition-colors"
                                value={dialogContent.name || ""}
                                onChange={(e) =>
                                    setDialogContent((prev) => ({
                                        ...prev,
                                        name: e.target.value,
                                    }))
                                }
                                autocomplete="off"
                                placeholder="Enter name"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                Username <span className="text-red-500">*</span>
                            </label>
                            <Input
                                className="w-full bg-white dark:bg-card border border-neutral-200 dark:border-neutral-800 rounded-lg focus:border-blue-500 h-10 transition-colors"
                                value={dialogContent.username || ""}
                                onChange={(e) =>
                                    setDialogContent((prev) => ({
                                        ...prev,
                                        username: e.target.value,
                                    }))
                                }
                                autocomplete="off"
                                placeholder="Enter username"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                Contact <span className="text-red-500">*</span>
                            </label>
                            <Input
                                className="w-full bg-white dark:bg-card border border-neutral-200 dark:border-neutral-800 rounded-lg focus:border-blue-500 h-10 transition-colors"
                                value={dialogContent.contact || ""}
                                onChange={(e) =>
                                    setDialogContent((prev) => ({
                                        ...prev,
                                        contact: e.target.value,
                                    }))
                                }
                                type="number"
                                autocomplete="off"
                                placeholder="Enter contact number"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                Email
                            </label>
                            <Input
                                className="w-full bg-white dark:bg-card border border-neutral-200 dark:border-neutral-800 rounded-lg focus:border-blue-500 h-10 transition-colors"
                                value={dialogContent.email || ""}
                                onChange={(e) =>
                                    setDialogContent((prev) => ({
                                        ...prev,
                                        email: e.target.value,
                                    }))
                                }
                                autocomplete="off"
                                placeholder="Enter email address"
                            />
                        </div>

                        <div>
                            <label className="block mb-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                Password
                            </label>
                            <Input
                                className="w-full bg-white dark:bg-card border border-neutral-200 dark:border-neutral-800 rounded-lg focus:border-blue-500 h-10 transition-colors"
                                value={dialogContent.password || ""}
                                onChange={(e) =>
                                    setDialogContent((prev) => ({
                                        ...prev,
                                        password: e.target.value,
                                    }))
                                }
                                type="password"
                                autocomplete="off"
                                placeholder="Enter new password"
                            />
                        </div>
                    </form>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-900/30 border border-neutral-100 dark:border-neutral-800 p-2.5 rounded-lg flex items-start gap-2">
                        <span>
                            <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                                Tip:
                            </span>{" "}
                            Leave password blank if you do not want to update
                            it.
                        </span>
                    </div>
                    <DialogFooter className="mt-4 gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            className="cursor-pointer rounded-lg border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 px-5 h-10"
                            onClick={() => setDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <SpinnerButton
                            loading={loading.update}
                            disabled={loading.update}
                            onClick={handleUpdate}
                            loadingText="Updating..."
                            variant="default"
                            className="ms-4 cursor-pointer rounded-lg bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:text-neutral-900 dark:hover:bg-blue-400 px-5 h-10 font-medium border-none"
                        >
                            Update
                        </SpinnerButton>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default RoleSettings;
