import { useState, useEffect, useContext } from "react";
import { FaDatabase, FaTrash, FaDownload } from "react-icons/fa6";
import { IoMdRefresh } from "react-icons/io";
import {
    MdSettingsBackupRestore,
    MdStorage,
    MdDateRange,
} from "react-icons/md";
import { Button } from "../components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import PaginationTable from "../components/PaginationTable";
import Spinner from "../components/Spinner";
import toaster from "../utils/toaster";
import { Context } from "../utils/Context";
import apiService from "../utils/apiService";
import { Calendar } from "../components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "../components/ui/popover";
import { Chip } from "../components/ui/chip";

const BackupLogs = () => {
    const { user } = useContext(Context);
    const [fetchedData, setFetchedData] = useState({
        items: [],
        totalPages: 1,
        currentPage: 1,
        totalItems: 0,
        totalSize: 0,
        totalItemsLocal: 0,
        totalItemsNetwork: 0,
        totalSizeLocal: 0,
        totalSizeNetwork: 0,
    });
    const [latestBackupTime, setLatestBackupTime] = useState("Never");
    const [tableData, setTableData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [isDeleteRangeDialogOpen, setIsDeleteRangeDialogOpen] =
        useState(false);
    const [deleteStartDate, setDeleteStartDate] = useState(null);
    const [deleteEndDate, setDeleteEndDate] = useState(null);
    const [isStartCalendarOpen, setIsStartCalendarOpen] = useState(false);
    const [isEndCalendarOpen, setIsEndCalendarOpen] = useState(false);
    const [isDeletingRange, setIsDeletingRange] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 8;

    const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
    const [restorePassword, setRestorePassword] = useState("");
    const [isRestoring, setIsRestoring] = useState(false);
    const [selectedRestoreFile, setSelectedRestoreFile] = useState(null);

    const handleRestore = async () => {
        if (!selectedRestoreFile) {
            toaster("error", "Please select a backup file");
            return;
        }
        try {
            setIsRestoring(true);
            toaster("info", "Uploading and restoring database backup...");
            
            const formData = new FormData();
            formData.append("backupFile", selectedRestoreFile);
            formData.append("password", restorePassword);

            const res = await apiService.post("/backups/restore", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            if (res?.success) {
                toaster("success", "Database restored successfully");
                setIsRestoreDialogOpen(false);
                setRestorePassword("");
                setSelectedRestoreFile(null);
                fetchBackups(1);
            } else {
                toaster("error", "Restore failed");
            }
        } catch (error) {
            console.error("Restore error:", error);
            toaster(
                "error",
                error.response?.data?.message || "Failed to restore database"
            );
        } finally {
            setIsRestoring(false);
        }
    };

    // Format size (input in KB) to human readable format
    const formatSize = (kb, decimals = 2) => {
        const numKB = parseFloat(kb);
        if (isNaN(numKB) || numKB === 0) return "0 KB";
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ["KB", "MB", "GB", "TB"];
        if (numKB < 1) return numKB + " KB";
        const i = Math.floor(Math.log(numKB) / Math.log(k));
        return (
            parseFloat((numKB / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
        );
    };

    // Fetch all backup logs from backend
    const fetchBackups = async (page = currentPage) => {
        setIsLoading(true);
        try {
            const res = await apiService.get("/backups/list", {
                params: {
                    page,
                    size: pageSize,
                },
            });
            if (res?.success) {
                setFetchedData({
                    items: res.backups || [],
                    totalPages: res.totalPages || 1,
                    currentPage: res.currentPage || 1,
                    totalItems: res.totalItems || 0,
                    totalSize: res.totalSize || 0,
                    totalItemsLocal: res.totalItemsLocal || 0,
                    totalItemsNetwork: res.totalItemsNetwork || 0,
                    totalSizeLocal: res.totalSizeLocal || 0,
                    totalSizeNetwork: res.totalSizeNetwork || 0,
                });
                if (page === 1 && res.backups?.length > 0) {
                    const latestDate = new Date(
                        res.backups[0].date
                    ).toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        hour12: true,
                    });
                    setLatestBackupTime(latestDate);
                }
            } else {
                toaster("error", "Failed to fetch backup logs");
            }
        } catch (error) {
            console.error("Fetch backups error:", error);
            toaster("error", "Failed to fetch backup logs");
        } finally {
            setIsLoading(false);
        }
    };

    // Download backup file
    const handleDownload = async (filename) => {
        try {
            toaster("info", `Downloading ${filename}...`);
            await apiService.downloadFile(`/backups/download/${filename}`);
            toaster("success", "Download started");
        } catch (error) {
            console.error("Download failed:", error);
            toaster("error", "Download failed");
        }
    };

    // Delete backup file
    const handleDelete = async (filename) => {
        if (
            !window.confirm(
                `Are you sure you want to delete backup file: ${filename}?`
            )
        ) {
            return;
        }
        try {
            const res = await apiService.delete(`/backups/delete/${filename}`);
            if (res?.success) {
                toaster("success", "Backup deleted successfully");
                fetchBackups();
            } else {
                toaster("error", "Failed to delete backup file");
            }
        } catch (error) {
            console.error("Delete backup error:", error);
            toaster(
                "error",
                error.response?.data?.message || "Failed to delete backup file"
            );
        }
    };

    // Trigger backup process directly
    const handleRunBackup = async () => {
        try {
            setIsBackingUp(true);
            toaster("info", "Starting database backup...");
            const res = await apiService.post("/backups/manual-backup");
            if (res?.success) {
                toaster("success", "Backup completed successfully");
                setCurrentPage(1);
                fetchBackups(1);
            } else {
                toaster("error", "Backup failed");
            }
        } catch (error) {
            console.error("Backup trigger error:", error);
            const errorMessage = error.response?.data?.message || "Backup failed";
            toaster("error", errorMessage);
            
            if (errorMessage.toLowerCase().includes("network")) {
                setCurrentPage(1);
                fetchBackups(1);
            }
        } finally {
            setIsBackingUp(false);
        }
    };

    // Fetch backups when current page changes
    useEffect(() => {
        fetchBackups(currentPage);
    }, [currentPage]);

    // Map backend backup logs to table rows
    useEffect(() => {
        const mapped = (fetchedData?.items || []).map((row) => {
            const formattedDate = new Date(row.date).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
                hour12: true,
            });

            return {
                ...row,
                formattedFilename: (
                    <div className="flex items-center gap-2 font-mono text-xs text-gray-700">
                        <FaDatabase className="text-primary text-sm flex-shrink-0" />
                        <span
                            className="truncate max-w-[280px]"
                            title={row.filename}
                        >
                            {row.filename}
                        </span>
                    </div>
                ),
                formattedDate: (
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <MdDateRange className="text-gray-400 text-base" />
                        <span>{formattedDate}</span>
                    </div>
                ),
                formattedSize: (
                    <div className="flex items-center gap-1.5 text-xs text-gray-700 font-semibold">
                        <MdStorage className="text-gray-400 text-base" />
                        <span>{formatSize(row.size)}</span>
                    </div>
                ),
                location:
                    row.location == "local" ? (
                        <Chip variant="danger">Local</Chip>
                    ) : (
                        <Chip variant="success">Server</Chip>
                    ),
                action: (
                    <div className="flex gap-2 w-20 items-center justify-center">
                        {row.location === "local" && (
                            <Button
                                variant="ghost"
                                className="cursor-pointer h-8 w-8 rounded-full border border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 p-0 transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownload(row.filename);
                                }}
                                title="Download Backup"
                            >
                                <FaDownload className="h-4 w-4" />
                            </Button>
                        )}
                        {(user?.role === "admin" ||
                            user?.role === "superuser") &&
                            row.location === "local" && (
                                <Button
                                    variant="ghost"
                                    className="cursor-pointer h-8 w-8 rounded-full border border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 p-0 transition-colors"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(row.filename);
                                    }}
                                    title="Delete Backup"
                                >
                                    <FaTrash className="h-3.5 w-3.5" />
                                </Button>
                            )}
                    </div>
                ),
            };
        });

        setTableData(mapped);
    }, [fetchedData.items, user]);

    const columns = [
        { key: "formattedFilename", header: "Backup File Name" },
        { key: "formattedDate", header: "Backup Date" },
        { key: "formattedSize", header: "Backup Size" },
        { key: "location", header: "Location" },
        {
            key: "action",
            header: <p className="text-center w-21">Action</p>,
        },
    ];

    // Statistics from paginated results and state
    const latestBackup = latestBackupTime;

    return (
        <div className="h-full p-2">
            {/* Header section with Stats Card design */}
            <div className="mb-6 bg-white p-6 rounded-2xl border border-gray-150 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <MdSettingsBackupRestore className="text-2xl text-indigo-600 animate-pulse" />
                        Database Backup Logs
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">
                        Monitor or trigger manual system database backups.
                    </p>
                </div>

                {/* Stats segment */}
                <div className="flex flex-wrap items-center gap-4 md:gap-8 bg-gray-50 p-3 rounded-xl border border-gray-200">
                    <div className="text-left px-2">
                        <span className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                            Total Backups
                        </span>
                        <div className="flex flex-col gap-0.5 text-xs font-semibold text-gray-800">
                            <span
                                className="flex items-center gap-1.5"
                                title="Local Backups"
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                Local: {fetchedData.totalItemsLocal}
                            </span>
                            <span
                                className="flex items-center gap-1.5"
                                title="Network Backups"
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                Network: {fetchedData.totalItemsNetwork}
                            </span>
                        </div>
                    </div>
                    <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>
                    <div className="text-left px-2">
                        <span className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                            Total Size Used
                        </span>
                        <div className="flex flex-col gap-0.5 text-xs font-semibold text-gray-800">
                            <span
                                className="flex items-center gap-1.5"
                                title="Local Size"
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                Local: {formatSize(fetchedData.totalSizeLocal)}
                            </span>
                            <span
                                className="flex items-center gap-1.5"
                                title="Network Size"
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                Network:{" "}
                                {formatSize(fetchedData.totalSizeNetwork)}
                            </span>
                        </div>
                    </div>
                    <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>
                    <div className="text-left px-2">
                        <span className="block text-[10px] uppercase font-bold text-gray-400">
                            Latest Backup
                        </span>
                        <span
                            className="text-sm font-bold text-gray-800 truncate max-w-[150px]"
                            title={latestBackup}
                        >
                            {latestBackup}
                        </span>
                    </div>
                </div>
            </div>

            {/* Action panel */}
            <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => fetchBackups()}
                        disabled={isLoading || isBackingUp}
                        className="flex items-center gap-1.5 text-xs hover:bg-gray-100 cursor-pointer"
                    >
                        <IoMdRefresh
                            className={`text-xs ${isLoading ? "animate-spin" : ""}`}
                        />
                        Refresh List
                    </Button>
                </div>

                {(user?.role === "admin" || user?.role === "superuser") && (
                    <div className="flex items-center gap-2">
                        <Button
                            disabled={isLoading || isRestoring}
                            onClick={() => {
                                setSelectedRestoreFile(null);
                                setRestorePassword("");
                                setIsRestoreDialogOpen(true);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 text-xs font-semibold px-4 cursor-pointer shadow-sm shadow-emerald-150 transition-all duration-200"
                        >
                            <MdSettingsBackupRestore className="text-sm" />
                            Restore Database
                        </Button>

                        <Button
                            disabled={isLoading || isBackingUp}
                            onClick={handleRunBackup}
                            className="bg-primary hover:bg-primary/90 text-white flex items-center gap-1.5 text-xs font-semibold px-4 cursor-pointer shadow-sm shadow-indigo-150 transition-all duration-200"
                        >
                            <FaDatabase
                                className={`text-xs ${isBackingUp ? "animate-bounce" : ""}`}
                            />
                            {isBackingUp ? "Backing up..." : "Create Backup"}
                        </Button>

                        <Dialog
                            open={isDeleteRangeDialogOpen}
                            onOpenChange={setIsDeleteRangeDialogOpen}
                        >
                            <DialogTrigger asChild>
                                <Button
                                    disabled={isLoading || isDeletingRange}
                                    className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5 text-xs font-semibold px-4 cursor-pointer shadow-sm shadow-red-150 transition-all duration-200"
                                >
                                    <FaTrash className="text-xs" />
                                    Delete Local Backups
                                </Button>
                            </DialogTrigger>
                            <DialogContent
                                className="sm:max-w-[425px]"
                                onPointerDownOutside={(e) => e.preventDefault()}
                            >
                                <DialogHeader>
                                    <DialogTitle>
                                        Delete Local Backups
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label className="text-right font-medium text-gray-700 text-xs">
                                            Start Date
                                        </Label>
                                        <div className="col-span-3">
                                            <Popover
                                                open={isStartCalendarOpen}
                                                onOpenChange={
                                                    setIsStartCalendarOpen
                                                }
                                            >
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        className="w-full justify-between text-left font-normal text-xs"
                                                    >
                                                        {deleteStartDate
                                                            ? deleteStartDate.toLocaleDateString(
                                                                  "en-IN"
                                                              )
                                                            : "Select Start Date"}
                                                        <MdDateRange className="text-gray-400 text-sm ml-2" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent
                                                    className="w-auto overflow-hidden p-0"
                                                    align="start"
                                                    portal={false}
                                                >
                                                    <Calendar
                                                        mode="single"
                                                        selected={
                                                            deleteStartDate
                                                        }
                                                        onSelect={(date) => {
                                                            setDeleteStartDate(
                                                                date
                                                            );
                                                            setIsStartCalendarOpen(
                                                                false
                                                            );
                                                        }}
                                                        disabled={(date) =>
                                                            date > new Date()
                                                        }
                                                        classNames={{
                                                            day: "h-9 w-9 text-sm rounded-sm overflow-hidden aria-selected:bg-blue-500 aria-selected:text-white",
                                                        }}
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label className="text-right font-medium text-gray-700 text-xs">
                                            End Date
                                        </Label>
                                        <div className="col-span-3">
                                            <Popover
                                                open={isEndCalendarOpen}
                                                onOpenChange={
                                                    setIsEndCalendarOpen
                                                }
                                            >
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        className="w-full justify-between text-left font-normal text-xs"
                                                    >
                                                        {deleteEndDate
                                                            ? deleteEndDate.toLocaleDateString(
                                                                  "en-IN"
                                                              )
                                                            : "Select End Date"}
                                                        <MdDateRange className="text-gray-400 text-sm ml-2" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent
                                                    className="w-auto overflow-hidden p-0"
                                                    align="start"
                                                    portal={false}
                                                >
                                                    <Calendar
                                                        mode="single"
                                                        selected={deleteEndDate}
                                                        onSelect={(date) => {
                                                            setDeleteEndDate(
                                                                date
                                                            );
                                                            setIsEndCalendarOpen(
                                                                false
                                                            );
                                                        }}
                                                        disabled={(date) =>
                                                            date > new Date()
                                                        }
                                                        classNames={{
                                                            day: "h-9 w-9 text-sm rounded-sm overflow-hidden aria-selected:bg-blue-500 aria-selected:text-white",
                                                        }}
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setIsDeleteRangeDialogOpen(false);
                                            setDeleteStartDate(null);
                                            setDeleteEndDate(null);
                                        }}
                                        disabled={isDeletingRange}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        className="bg-red-600 hover:bg-red-700 text-white font-semibold"
                                        disabled={
                                            isDeletingRange ||
                                            !deleteStartDate ||
                                            !deleteEndDate
                                        }
                                        onClick={async () => {
                                            try {
                                                setIsDeletingRange(true);
                                                const formatDateToYYYYMMDD = (
                                                    d
                                                ) => {
                                                    if (!d) return "";
                                                    const year =
                                                        d.getFullYear();
                                                    const month = (
                                                        d.getMonth() + 1
                                                    )
                                                        .toString()
                                                        .padStart(2, "0");
                                                    const day = d
                                                        .getDate()
                                                        .toString()
                                                        .padStart(2, "0");
                                                    return `${year}-${month}-${day}`;
                                                };
                                                const res =
                                                    await apiService.post(
                                                        "/backups/delete-local-range",
                                                        {
                                                            startDate:
                                                                formatDateToYYYYMMDD(
                                                                    deleteStartDate
                                                                ),
                                                            endDate:
                                                                formatDateToYYYYMMDD(
                                                                    deleteEndDate
                                                                ),
                                                        }
                                                    );
                                                if (res?.success) {
                                                    toaster(
                                                        "success",
                                                        res.message
                                                    );
                                                    setCurrentPage(1);
                                                    fetchBackups(1);
                                                    setIsDeleteRangeDialogOpen(
                                                        false
                                                    );
                                                    setDeleteStartDate(null);
                                                    setDeleteEndDate(null);
                                                } else {
                                                    toaster(
                                                        "error",
                                                        "Delete failed"
                                                    );
                                                }
                                            } catch (err) {
                                                console.error(
                                                    "Delete range error:",
                                                    err
                                                );
                                                toaster(
                                                    "error",
                                                    err.response?.data
                                                        ?.message ||
                                                        "Delete failed"
                                                );
                                            } finally {
                                                setIsDeletingRange(false);
                                            }
                                        }}
                                    >
                                        {isDeletingRange
                                            ? "Deleting..."
                                            : "Delete"}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                )}
            </div>

            {/* Main Table area */}
            <div className="overflow-hidden">
                {isLoading ? (
                    <div className="py-20 flex justify-center items-center">
                        <Spinner />
                    </div>
                ) : (
                    <PaginationTable
                        data={tableData}
                        columns={columns}
                        currentPage={fetchedData.currentPage}
                        pageSize={pageSize}
                        totalPages={fetchedData.totalPages}
                        onPageChange={setCurrentPage}
                        totalItems={fetchedData.totalItems}
                    />
                )}
            </div>

            {/* Restore Backup Dialog */}
            <Dialog
                open={isRestoreDialogOpen}
                onOpenChange={(open) => {
                    setIsRestoreDialogOpen(open);
                    if (!open) {
                        setRestorePassword("");
                        setSelectedRestoreFile(null);
                    }
                }}
            >
                <DialogContent
                    className="sm:max-w-[425px]"
                    onPointerDownOutside={(e) => e.preventDefault()}
                >
                    <DialogHeader>
                        <DialogTitle>Restore Database Backup</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <p className="text-xs text-gray-500">
                            Upload a `.ams` backup file and enter your password to restore the database.
                            <span className="block mt-2 text-red-600 font-semibold">
                                Warning: This will overwrite the current database.
                            </span>
                        </p>
                        
                        <div className="grid grid-cols-4 items-center gap-4 mt-2">
                            <Label className="text-right font-medium text-gray-700 text-xs col-span-1">
                                Backup File
                            </Label>
                            <Input
                                type="file"
                                accept=".ams"
                                className="col-span-3 text-xs"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files.length > 0) {
                                        setSelectedRestoreFile(e.target.files[0]);
                                    }
                                }}
                            />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4 mt-2">
                            <Label className="text-right font-medium text-gray-700 text-xs col-span-1">
                                Admin Password
                            </Label>
                            <Input
                                type="password"
                                className="col-span-3 text-xs"
                                placeholder="Enter admin password to confirm"
                                value={restorePassword}
                                onChange={(e) => setRestorePassword(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsRestoreDialogOpen(false);
                                setRestorePassword("");
                                setSelectedRestoreFile(null);
                            }}
                            disabled={isRestoring}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                            disabled={isRestoring || !restorePassword || !selectedRestoreFile}
                            onClick={handleRestore}
                        >
                            {isRestoring ? "Restoring..." : "Restore"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default BackupLogs;
