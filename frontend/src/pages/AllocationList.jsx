import { useEffect, useState } from "react";
import { FaDownload, FaEye } from "react-icons/fa6";
import { TbTagMinus } from "react-icons/tb";
import { motion } from "framer-motion";
import { Monitor, User, Calendar, Clock, AlertCircle, X, Layers } from "lucide-react";

const getInitials = (name) => {
    if (!name) return "";
    return name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
};

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import SpinnerButton from "../components/ui/spinner-button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../components/ui/select";

import PaginationTable from "../components/PaginationTable";
import apiService from "../utils/apiService";
import { formatDate, formatDateTime } from "../utils/helperFunctions";
import toaster from "../utils/toaster";
import Spinner from "../components/Spinner";

const columns = [
    { key: "asset_id", header: "Asset ID" },
    { key: "serial", header: "Serial" },
    { key: "type", header: "Type" },
    { key: "model_no", header: "Model No" },
    { key: "emp_code", header: "Employee ID" },
    { key: "name", header: "Employee Name" },
    { key: "action", header: "Actions" },
];

const AllocationList = () => {
    const [search, setSearch] = useState(""); // used for actual fetch
    const [searchInput, setSearchInput] = useState(""); // input field value
    const [loading, setLoading] = useState({
        table: false,
        search: false,
        viewDetagging: false,
        report: false,
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(5);
    const [fetchedData, setFetchedData] = useState({
        items: [],
        totalItems: 0,
        totalPages: 0,
        currentPage: 0,
        pageSize: 0,
    });
    const [isOpen, setIsOpen] = useState({
        view: false,
        confirmation: false,
        report: false,
    });
    const [dialogDetails, setDialogDetails] = useState({});
    const [reportType, setReportType] = useState("tagged");

    useEffect(() => {
        const fetchData = async () => {
            setLoading((prev) => ({ ...prev, table: true }));
            try {
                const response = await apiService.get("/taggings/list", {
                    params: {
                        page: currentPage,
                        size: pageSize,
                        search: search,
                    },
                });
                setFetchedData(response.data);
            } catch (error) {
                console.error("Error fetching allocation data:", error);
            } finally {
                setLoading((prev) => ({ ...prev, table: false }));
            }
        };

        fetchData();
    }, [currentPage, pageSize, search]);

    const handleViewDetails = (row) => {
        setIsOpen((prev) => ({ ...prev, view: true }));
        setDialogDetails(row);
    };

    const handleDetagging = async (row) => {
        setLoading((prev) => ({ ...prev, viewDetagging: true }));
        try {
            await apiService.post(`/taggings/remove`, {
                assetId: dialogDetails.asset_uid,
                employeeId: dialogDetails.employee_id,
            });
            setIsOpen((prev) => ({
                ...prev,
                confirmation: false,
                view: false,
            }));
            setCurrentPage(1);
            setSearch(undefined);
            toaster("success", "Asset detagged successfully");
        } catch (error) {
            toaster("error", "Failed to detag asset");
        } finally {
            setLoading((prev) => ({ ...prev, viewDetagging: false }));
        }
    };

    const tableData = fetchedData.items.map((item) => ({
        ...item,
        action: (
            <div className="flex gap-2">
                <Button
                    variant="outline"
                    size="icon"
                    className="cursor-pointer"
                    onClick={() => {
                        handleViewDetails(item);
                    }}
                >
                    <FaEye />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    className="cursor-pointer"
                    onClick={() => {
                        setDialogDetails(item);
                        setIsOpen((prev) => ({ ...prev, confirmation: true }));
                    }}
                >
                    <TbTagMinus />
                </Button>
            </div>
        ),
    }));
    const handleReportDownload = async () => {
        setLoading((prev) => ({ ...prev, report: true }));
        try {
            await apiService.downloadFile(
                "/users/backup-dashboard",
                { category: reportType },
                "post"
            );
        } catch (error) {
            console.log(error);

            toaster("error", "Failed to download backup file");
        } finally {
            setLoading((prev) => ({ ...prev, report: false }));
        }
    };

    return (
        <div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400 flex items-center gap-2">
                        <Layers className="h-6 w-6 text-blue-600 dark:text-blue-500" />
                        Allocation List
                    </h2>
                </div>
                <Button
                    className="cursor-pointer w-auto"
                    onClick={() =>
                        setIsOpen((prev) => ({ ...prev, report: true }))
                    }
                >
                    <FaDownload className="mr-2 h-4 w-4" /> Download Report
                </Button>
            </div>
            <div className="my-4 flex flex-row justify-end gap-2">
                <Input
                    type="text"
                    placeholder="Search by asset id, asset name, employee id or employee name"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="w-full bg-white"
                />
                <Button
                    onClick={() => {
                        setCurrentPage(1);
                        setSearch(searchInput);
                    }}
                    className="cursor-pointer w-auto"
                >
                    Search
                </Button>
            </div>
            {loading.table ? (
                <Spinner />
            ) : (
                <PaginationTable
                    data={tableData}
                    columns={columns}
                    currentPage={currentPage}
                    pageSize={fetchedData.pageSize}
                    totalPages={fetchedData.totalPages}
                    onPageChange={setCurrentPage}
                    totalItems={fetchedData.totalItems}
                />
            )}
            <Dialog
                open={isOpen.view}
                onOpenChange={(set) =>
                    setIsOpen((prev) => ({ ...prev, view: set }))
                }
            >
                <DialogDescription className="hidden" />
                <DialogContent
                    className="max-w-[90vw] w-[850px] max-h-[90vh] overflow-y-auto p-6"
                    onPointerDownOutside={() =>
                        setIsOpen((prev) => ({ ...prev, view: false }))
                    }
                    unbounded
                >
                    <DialogHeader className="border-b border-border pb-4 mb-2">
                        <DialogTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                            Tagging Details
                        </DialogTitle>
                    </DialogHeader>

                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="flex flex-col lg:flex-row w-full gap-5 mt-4"
                    >
                        {/* Left Column: Asset Details */}
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.05, duration: 0.25 }}
                            className="w-full lg:w-1/2 relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow duration-300"
                        >
                            <div className="flex items-center gap-2.5 border-b border-border pb-3 mb-4">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <Monitor size={18} />
                                </div>
                                <h4 className="font-semibold text-base text-foreground">
                                    Asset Information
                                </h4>
                            </div>

                            <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                                <div>
                                    <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                        Asset ID
                                    </span>
                                    <span className="text-sm font-semibold text-foreground">
                                        {dialogDetails?.asset_id || "N/A"}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                        Serial
                                    </span>
                                    <span className="text-sm font-semibold text-foreground">
                                        {dialogDetails?.serial || "N/A"}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                        Type
                                    </span>
                                    <span className="text-sm font-medium text-foreground">
                                        {dialogDetails?.type || "N/A"}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                        Model No
                                    </span>
                                    <span className="text-sm font-medium text-foreground">
                                        {dialogDetails?.model_no || "N/A"}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                        Status
                                    </span>
                                    <div className="mt-1">
                                        <span
                                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider border ${
                                                dialogDetails?.status?.toLowerCase() ===
                                                    "active" ||
                                                dialogDetails?.status?.toLowerCase() ===
                                                    "allocated" ||
                                                dialogDetails?.status?.toLowerCase() ===
                                                    "tagged"
                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                                                    : dialogDetails?.status?.toLowerCase() ===
                                                        "maintenance"
                                                      ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
                                                      : "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20"
                                            }`}
                                        >
                                            <span
                                                className={`h-1.5 w-1.5 rounded-full ${
                                                    dialogDetails?.status?.toLowerCase() ===
                                                        "active" ||
                                                    dialogDetails?.status?.toLowerCase() ===
                                                        "allocated" ||
                                                    dialogDetails?.status?.toLowerCase() ===
                                                        "tagged"
                                                        ? "bg-emerald-500"
                                                        : dialogDetails?.status?.toLowerCase() ===
                                                            "maintenance"
                                                          ? "bg-amber-500"
                                                          : "bg-slate-500"
                                                }`}
                                            />
                                            {dialogDetails?.status || "N/A"}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                        Location
                                    </span>
                                    <span className="text-sm font-medium text-foreground">
                                        {dialogDetails?.location || "N/A"}
                                    </span>
                                </div>
                                <div className="col-span-2">
                                    <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                        Expiry Date
                                    </span>
                                    <span className="text-sm font-medium text-foreground">
                                        {dialogDetails?.exp_date
                                            ? formatDate(
                                                  new Date(
                                                      dialogDetails?.exp_date
                                                  )
                                              )
                                            : "N/A"}
                                    </span>
                                </div>

                                {dialogDetails?.remarks && (
                                    <div className="col-span-2 mt-2 rounded-lg border border-yellow-500/20 bg-yellow-500/5 dark:bg-yellow-500/10 p-3 flex gap-2 items-start text-xs text-yellow-800 dark:text-yellow-200">
                                        <AlertCircle
                                            size={14}
                                            className="mt-0.5 shrink-0 text-yellow-600 dark:text-yellow-400"
                                        />
                                        <div>
                                            <span className="font-semibold block mb-0.5">
                                                Remarks
                                            </span>
                                            <p className="leading-relaxed">
                                                {dialogDetails.remarks}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        {/* Right Column: Employee and Tagging Details */}
                        <motion.div
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1, duration: 0.25 }}
                            className="w-full lg:w-1/2 flex flex-col gap-4"
                        >
                            {/* Employee Details Card */}
                            <div className="rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow duration-300">
                                <div className="flex items-center gap-2.5 border-b border-border pb-3 mb-4">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                        <User size={18} />
                                    </div>
                                    <h4 className="font-semibold text-base text-foreground">
                                        Employee Details
                                    </h4>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-primary/60 text-primary-foreground font-bold shadow-md shadow-primary/20 text-base">
                                        {getInitials(dialogDetails?.name)}
                                    </div>
                                    <div className="space-y-1">
                                        <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                            Employee Name
                                        </span>
                                        <div className="text-sm font-semibold text-foreground">
                                            {dialogDetails?.name || "N/A"}
                                        </div>
                                        <div className="flex items-center mt-0.5">
                                            <span className="font-medium bg-secondary text-secondary-foreground px-2 py-0.5 rounded border border-border text-[11px]">
                                                ID:{" "}
                                                {dialogDetails?.emp_code ||
                                                    "N/A"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Tagging Details Card */}
                            <div className="rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow duration-300">
                                <div className="flex items-center gap-2.5 border-b border-border pb-3 mb-4">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                        <Calendar size={18} />
                                    </div>
                                    <h4 className="font-semibold text-base text-foreground">
                                        Tagging History
                                    </h4>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5 rounded-full p-1 bg-primary/5 text-primary border border-primary/10">
                                            <Clock size={14} />
                                        </div>
                                        <div>
                                            <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                                Assigned On
                                            </span>
                                            <span className="text-sm font-semibold text-foreground">
                                                {dialogDetails?.assigned_at
                                                    ? formatDateTime(
                                                          new Date(
                                                              dialogDetails.assigned_at
                                                          )
                                                      )
                                                    : "N/A"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5 rounded-full p-1 bg-primary/5 text-primary border border-primary/10">
                                            <Calendar size={14} />
                                        </div>
                                        <div>
                                            <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                                Submission Date
                                            </span>
                                            <span className="text-sm font-semibold text-foreground">
                                                {dialogDetails?.assigned_submission
                                                    ? formatDate(
                                                          new Date(
                                                              dialogDetails.assigned_submission
                                                          )
                                                      )
                                                    : "N/A"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>

                    <DialogFooter className="flex-col sm:flex-row gap-2 mt-6 pt-4 border-t border-border">
                        <Button
                            className="cursor-pointer border-red-600 text-red-600 hover:bg-red-600/10 hover:text-red-600 w-full sm:w-[150px] transition-all hover:scale-[1.02] active:scale-[0.98]"
                            onClick={() => {
                                setIsOpen((prev) => ({
                                    ...prev,
                                    confirmation: true,
                                    view: false,
                                }));
                            }}
                            variant="outline"
                        >
                            <TbTagMinus className="mr-2 h-4 w-4" /> Detag
                        </Button>
                        <Button
                            className="cursor-pointer border-primary text-primary hover:bg-primary/10 hover:text-primary w-full sm:w-[150px] transition-all hover:scale-[1.02] active:scale-[0.98]"
                            onClick={() => {
                                setIsOpen((prev) => ({ ...prev, view: false }));
                            }}
                            variant="outline"
                        >
                            <X className="mr-2 h-4 w-4" /> Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog
                open={isOpen.confirmation}
                onOpenChange={(set) =>
                    setIsOpen((prev) => ({ ...prev, confirmation: set }))
                }
            >
                <DialogContent
                    className="max-w-[90vw] w-[500px]"
                    onPointerDownOutside={() => {}}
                    unbounded
                >
                    <DialogHeader>
                        <DialogTitle className="text-lg sm:text-xl">
                            Confirmation
                        </DialogTitle>
                    </DialogHeader>
                    <DialogDescription>
                        Do you want to detag {dialogDetails.asset_id} from{" "}
                        {dialogDetails.emp_code}?
                    </DialogDescription>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <SpinnerButton
                            loading={loading.viewDetagging}
                            disabled={loading.viewDetagging}
                            loadingText="Detagging..."
                            className="cursor-pointer border-red-600 text-red-600 hover:bg-red-600/10 hover:text-red-600 w-full sm:w-[150px]"
                            onClick={handleDetagging}
                            variant="outline"
                        >
                            Confirm
                        </SpinnerButton>
                        <Button
                            className="cursor-pointer border-primary text-primary hover:bg-primary/10 hover:text-primary w-full sm:w-[150px]"
                            onClick={() => {
                                setIsOpen((prev) => ({
                                    ...prev,
                                    confirmation: false,
                                }));
                            }}
                            variant="outline"
                        >
                            Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog
                open={isOpen.report}
                onOpenChange={(set) =>
                    setIsOpen((prev) => ({ ...prev, report: set }))
                }
            >
                <DialogDescription className="hidden" />
                <DialogContent
                    className="max-w-[90vw] w-[450px]"
                    onPointerDownOutside={() =>
                        setIsOpen((prev) => ({ ...prev, report: false }))
                    }
                    unbounded
                >
                    <DialogHeader>
                        <DialogTitle className="text-lg sm:text-xl">
                            Download Report
                        </DialogTitle>
                    </DialogHeader>
                    <Select
                        value={reportType}
                        onValueChange={(value) => setReportType(value)}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select Report Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="tagged">Only Tagged</SelectItem>
                            <SelectItem value="detagged">
                                Only Detagged
                            </SelectItem>
                            <SelectItem value="tagged-detagged">
                                Tagged and Detagged
                            </SelectItem>
                        </SelectContent>
                    </Select>
                    <div className="flex items-center justify-center mt-5">
                        <SpinnerButton
                            className="cursor-pointer"
                            loading={loading.report}
                            disabled={loading.report}
                            loadingText="Downloading..."
                            onClick={handleReportDownload}
                        >
                            Download
                        </SpinnerButton>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AllocationList;
