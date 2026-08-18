import { useContext, useEffect, useState } from "react";
import { FaDownload } from "react-icons/fa6";
import { motion } from "framer-motion";
import { Monitor, User, X, Clock, AlertCircle, Trash2 } from "lucide-react";

import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
    DialogHeader,
    DialogFooter,
} from "../components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import PaginationTable from "../components/PaginationTable";
import apiService from "../utils/apiService";
import Spinner from "../components/Spinner";
import { capitalizeWords, formatDate } from "../utils/helperFunctions";
import toaster from "../utils/toaster";
import SpinnerButton from "../components/ui/spinner-button";
import { Context } from "../utils/Context";

const getInitials = (name) => {
    if (!name) return "";
    return name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
};

const columns = [
    { key: "asset_id", header: "Asset ID" },
    { key: "serial", header: "Serial" },
    { key: "type", header: "Category" },
    { key: "model_no", header: "Model No" },
    { key: "status", header: "Status" },
];

const DisposedAssets = () => {
    const { user } = useContext(Context);
    const [search, setSearch] = useState(""); // used for actual fetch
    const [searchInput, setSearchInput] = useState(""); // input field value
    const [loading, setLoading] = useState({
        table: false,
        download: false,
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(6);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [items, setItems] = useState([]);
    const [tableData, setTableData] = useState([]);
    const [isOpen, setIsOpen] = useState({
        view: false,
    });

    const [viewForm, setViewForm] = useState({
        id: "",
        asset_id: "",
        serial: "",
        type: "",
        model_no: "",
        status: "active",
        assigned_to: "",
        location: "",
        gl_account: "",
        asset_code: "",
        pis_date: "",
        supplier_name: "",
        remarks: "",
        exp_date: "",
        assigned_submission: "",
        asset_criticality: "",
        asset_type: "",
        emp_id: "",
        disposalDate: "",
        diposalMethod: "",
        saleTo: "",
        donatedTo: "",
        trashTo: "",
    });

    async function fetchAssets() {
        setLoading((prev) => ({ ...prev, table: true }));
        try {
            const res = await apiService.get("/assets/disposed", {
                params: {
                    page: currentPage,
                    size: pageSize,
                    search: search || undefined,
                },
            });
            const data = res.data;
            setItems(data.items);
            setTotalPages(data.totalPages);
            setTotalItems(data.totalItems || 0);
        } catch (error) {
            setItems([]);
            setTotalPages(1);
        } finally {
            setLoading((prev) => ({ ...prev, table: false }));
        }
    }

    useEffect(() => {
        fetchAssets();
    }, [currentPage, pageSize, search]);

    useEffect(() => {
        let t = items.map((row) => ({
            ...row,
            status: capitalizeWords(row.status),
        }));
        setTableData(t);
    }, [items]);

    const onClickRow = (row) => {
        setIsOpen((prev) => ({ ...prev, view: true }));
        setViewForm({
            ...row,
            exp_date: row.exp_date ? new Date(row.exp_date) : undefined,
            assigned_submission: row.assigned_submission
                ? new Date(row.assigned_submission)
                : undefined,
            pis_date: row.pis_date ? new Date(row.pis_date) : undefined,
            disposalDate: row.disposalDate
                ? new Date(row.disposalDate)
                : undefined,
        });
    };

    const handleBackup = async () => {
        setLoading((prev) => ({ ...prev, download: true }));
        try {
            await apiService.downloadFile("/assets/disposed-backup");
        } catch (error) {
            toaster("error", "Failed to create backup.");
        } finally {
            setLoading((prev) => ({ ...prev, download: false }));
        }
    };

    return (
        <div>
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400 flex items-center gap-2">
                        <Trash2 className="h-6 w-6  text-blue-600 dark:text-blue-500" />
                        Disposed Assets
                    </h2>
                </div>
                <SpinnerButton
                    loading={loading.download}
                    loadingText="Please Wait..."
                    disabled={loading.download}
                    className="cursor-pointer rounded-lg bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:text-neutral-900 dark:hover:bg-blue-400 border-0 shadow-sm transition-all duration-150 py-2 px-4 flex items-center gap-2 font-medium"
                    onClick={handleBackup}
                >
                    <FaDownload className="size-4" /> Download CSV
                </SpinnerButton>
            </div>

            {/* Search Panel */}
            <div className="mb-6 flex items-center gap-3">
                <div className="relative flex-1">
                    <Input
                        type="text"
                        placeholder="Search by asset id, serial, model no, type or status..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="w-full bg-white dark:bg-card border border-neutral-200 dark:border-neutral-800 rounded-lg focus:border-blue-500 dark:focus:border-blue-500 h-10 transition-all duration-150"
                    />
                </div>
                <Button
                    onClick={() => {
                        setCurrentPage(1);
                        setSearch(searchInput);
                    }}
                    className="cursor-pointer bg-blue-600 text-white dark:bg-blue-500 dark:text-neutral-900 hover:bg-blue-700 dark:hover:bg-blue-400 h-10 px-5 rounded-lg transition-all duration-150 font-medium border-0 shadow-xs"
                    disabled={search === searchInput}
                >
                    Search
                </Button>
            </div>

            {loading.table ? (
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
                    onClickRow={onClickRow}
                    totalItems={totalItems}
                />
            )}

            <Dialog
                open={isOpen.view}
                onOpenChange={(set) =>
                    setIsOpen((prev) => ({ ...prev, view: set }))
                }
            >
                <DialogContent
                    className="max-w-[90vw] w-[850px] max-h-[90vh] overflow-y-auto p-6"
                    onPointerDownOutside={() =>
                        setIsOpen((prev) => ({ ...prev, view: false }))
                    }
                    unbounded
                >
                    <DialogHeader className="border-b border-border pb-4 mb-2">
                        <DialogTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                            Disposed Asset Details
                        </DialogTitle>
                        <DialogDescription className="hidden" />
                    </DialogHeader>

                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="flex flex-col lg:flex-row w-full gap-5 mt-4"
                    >
                        {/* Column 1: Asset Core Details */}
                        <div className="w-full lg:w-1/2 flex flex-col gap-4">
                            <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm">
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
                                            {viewForm.asset_id || "N/A"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                            Serial
                                        </span>
                                        <span className="text-sm font-semibold text-foreground">
                                            {viewForm.serial || "N/A"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                            Category
                                        </span>
                                        <span className="text-sm font-medium text-foreground">
                                            {viewForm.type || "N/A"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                            Model No
                                        </span>
                                        <span className="text-sm font-medium text-foreground">
                                            {viewForm.model_no || "N/A"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                            Status
                                        </span>
                                        <div className="mt-1">
                                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider border bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20">
                                                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                                {viewForm.status || "Disposed"}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                            Location
                                        </span>
                                        <span className="text-sm font-medium text-foreground">
                                            {viewForm.location || "N/A"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                            GL Account
                                        </span>
                                        <span className="text-sm font-medium text-foreground">
                                            {viewForm.gl_account || "--"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                            Unique Asset Code
                                        </span>
                                        <span className="text-sm font-medium text-foreground">
                                            {viewForm.asset_code || "--"}
                                        </span>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                            Supplier Name
                                        </span>
                                        <span className="text-sm font-medium text-foreground">
                                            {viewForm.supplier_name || "--"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                            Expiry Date
                                        </span>
                                        <span className="text-sm font-medium text-foreground">
                                            {viewForm.exp_date
                                                ? formatDate(viewForm.exp_date)
                                                : "N/A"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                            PIS Date
                                        </span>
                                        <span className="text-sm font-medium text-foreground">
                                            {viewForm.pis_date
                                                ? formatDate(viewForm.pis_date)
                                                : "N/A"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                            Asset Criticality
                                        </span>
                                        <span className="text-sm font-medium text-foreground">
                                            {viewForm.asset_criticality ||
                                                "N/A"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                            Asset Type
                                        </span>
                                        <span className="text-sm font-semibold text-foreground uppercase">
                                            {viewForm.asset_type === "it"
                                                ? "IT"
                                                : viewForm.asset_type ===
                                                    "admin"
                                                  ? "Admin"
                                                  : "N/A"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Column 2: Disposal details & Allocation */}
                        <div className="w-full lg:w-1/2 flex flex-col gap-4">
                            {/* Disposal Info Card */}
                            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                                <div className="flex items-center gap-2.5 border-b border-border pb-3 mb-4">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-650 dark:text-red-400">
                                        <Trash2 size={18} />
                                    </div>
                                    <h4 className="font-semibold text-base text-foreground">
                                        Disposal Information
                                    </h4>
                                </div>

                                <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                                    <div>
                                        <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                            Disposal Date
                                        </span>
                                        <span className="text-sm font-semibold text-foreground">
                                            {viewForm.disposalDate
                                                ? formatDate(
                                                      viewForm.disposalDate
                                                  )
                                                : "N/A"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                            Disposal Method
                                        </span>
                                        <span className="text-sm font-semibold text-foreground capitalize">
                                            {viewForm.diposalMethod || "N/A"}
                                        </span>
                                    </div>
                                    {viewForm.diposalMethod === "sale" && (
                                        <div className="col-span-2">
                                            <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                                Sold To
                                            </span>
                                            <span className="text-sm font-semibold text-foreground">
                                                {viewForm.saleTo || "N/A"}
                                            </span>
                                        </div>
                                    )}
                                    {viewForm.diposalMethod === "donation" && (
                                        <div className="col-span-2">
                                            <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                                Donated To
                                            </span>
                                            <span className="text-sm font-semibold text-foreground">
                                                {viewForm.donatedTo || "N/A"}
                                            </span>
                                        </div>
                                    )}
                                    {viewForm.diposalMethod === "trash" && (
                                        <div className="col-span-2">
                                            <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                                Trashed To
                                            </span>
                                            <span className="text-sm font-semibold text-foreground">
                                                {viewForm.trashTo || "N/A"}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Previous Allocation details Card */}
                            {viewForm.name && (
                                <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                                    <div className="flex items-center gap-2.5 border-b border-border pb-3 mb-4">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                            <User size={18} />
                                        </div>
                                        <h4 className="font-semibold text-base text-foreground">
                                            Previous Allocation
                                        </h4>
                                    </div>

                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-primary/60 text-primary-foreground font-bold shadow text-xs">
                                                {getInitials(viewForm.name)}
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-foreground">
                                                    {viewForm.name}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    ID: {viewForm.emp_code}
                                                </div>
                                            </div>
                                        </div>
                                        {viewForm.assigned_submission && (
                                            <div className="flex items-center gap-2 text-xs border-t sm:border-t-0 sm:border-l border-border pt-2.5 sm:pt-0 sm:pl-4">
                                                <Clock
                                                    size={14}
                                                    className="text-muted-foreground"
                                                />
                                                <div>
                                                    <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                                        Submission Due
                                                    </span>
                                                    <span className="font-semibold text-foreground">
                                                        {formatDate(
                                                            viewForm.assigned_submission
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {viewForm.remarks && (
                                <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 dark:bg-yellow-500/10 p-3 flex gap-2 items-start text-xs text-yellow-800 dark:text-yellow-200">
                                    <AlertCircle
                                        size={14}
                                        className="mt-0.5 shrink-0 text-yellow-600 dark:text-yellow-400"
                                    />
                                    <div>
                                        <span className="font-semibold block mb-0.5">
                                            Remarks
                                        </span>
                                        <p className="leading-relaxed">
                                            {viewForm.remarks}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    <DialogFooter className="mt-6 pt-4 border-t border-border flex justify-end">
                        <Button
                            className="cursor-pointer border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 w-full sm:w-[120px] transition-all hover:scale-[1.02] active:scale-[0.98]"
                            onClick={() => {
                                setIsOpen((prev) => ({
                                    ...prev,
                                    view: false,
                                }));
                            }}
                            type="button"
                            variant="outline"
                        >
                            <X className="mr-2 h-4 w-4" /> Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default DisposedAssets;
