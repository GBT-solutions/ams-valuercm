import { useContext, useEffect, useState } from "react";
import { FaDownload } from "react-icons/fa6";
import { FaTrash } from "react-icons/fa";
import { FiMinusCircle } from "react-icons/fi";
import { IoAddCircleOutline } from "react-icons/io5";
import { BsBox } from "react-icons/bs";
import { MdEdit } from "react-icons/md";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "../components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "../components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    CalendarIcon,
    Search,
    AlertCircle,
    Check,
    X,
    Monitor,
    User,
    Clock,
    Layers,
    History,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { motion } from "framer-motion";

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
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../components/ui/select";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Chip } from "../components/ui/chip";

import PaginationTable from "../components/PaginationTable";
import apiService from "../utils/apiService";
import Spinner from "../components/Spinner";
import {
    formatDate,
    getSqlDate,
    validateAssetId,
} from "../utils/helperFunctions";
import toaster from "../utils/toaster";
import SpinnerButton from "../components/ui/spinner-button";
import Combobox from "../components/Combobox";
import { Context } from "../utils/Context";

const columns = [
    { key: "asset_id", header: "Asset ID" },
    { key: "serial", header: "Serial" },
    { key: "type", header: "Category" },
    { key: "model_no", header: "Model No" },
    { key: "status_table", header: "Status" },
    {
        key: "action",
        header: <p className="text-center w-21">Action</p>,
        adminOnly: true,
    },
];

const AssetList = () => {
    const { employees, user } = useContext(Context);
    const [search, setSearch] = useState(""); // used for actual fetch
    const [searchInput, setSearchInput] = useState(""); // input field value
    const [loading, setLoading] = useState({
        table: false,
        search: false,
        download: false,
        detag: false,
        update: false,
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(6);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [items, setItems] = useState([]);
    const [tableData, setTableData] = useState([]);
    const [isOpen, setIsOpen] = useState({
        edit: false,
        editCalendar: false,
        view: false,
        submisstionCalendar: false,
        dispose: false,
        disposeCalendar: false,
    });
    const [disposeDetails, setDisposeDetails] = useState({
        disposalDate: new Date(),
        disposalMethod: "",
        saleTo: "",
        donatedTo: "",
        trashTo: "",
    });

    const [editForm, setEditForm] = useState({
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
        child_asset: 0,
        child_assets: [],
    });

    // Child Assets state
    const [allAssets, setAllAssets] = useState([]);
    const [selectedChildAssets, setSelectedChildAssets] = useState([]);

    // Fetch all assets for combobox
    useEffect(() => {
        const fetchAllAssets = async () => {
            try {
                const response = await apiService.get("/assets/all");
                setAllAssets(response.data || []);
            } catch (error) {
                console.error(
                    "Failed to fetch all assets for child selection:",
                    error
                );
            }
        };
        fetchAllAssets();
    }, []);

    async function fetchAssets() {
        setLoading((prev) => ({ ...prev, table: true }));
        try {
            const res = await apiService.get("/assets", {
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
            setTotalItems(0);
        } finally {
            setLoading((prev) => ({ ...prev, table: false }));
        }
    }

    useEffect(() => {
        fetchAssets();
    }, [currentPage, pageSize, search]);

    const handleEditClick = (row) => {
        setIsOpen((prev) => ({ ...prev, edit: true }));
        console.log("Row child assets:", row.child_assets);
        let parsedChildAssets = [];
        try {
            if (row.child_assets) {
                const parsed =
                    typeof row.child_assets === "string"
                        ? JSON.parse(row.child_assets)
                        : row.child_assets;
                parsedChildAssets = Array.isArray(parsed) ? parsed : [];
            }
        } catch (e) {
            console.error("Error parsing child_assets", e);
        }

        const initialChildAssets =
            parsedChildAssets.length > 0
                ? parsedChildAssets.map((asset, index) => ({
                      id: index,
                      value: String(asset.id),
                  }))
                : [];

        // Provide at least one empty row if child_asset is 1 but none were saved, or if they just toggled it
        if (row.child_asset == 1 && initialChildAssets.length === 0) {
            initialChildAssets.push({ id: Date.now(), value: "" });
        }

        setSelectedChildAssets(initialChildAssets);
        setEditForm({
            ...row,
            assigned_to: row.emp_code,
            emp_code: row.emp_code,
            child_asset:
                row.child_asset || (parsedChildAssets.length > 0 ? 1 : 0),
        });
    };
    const handleDisposeClicked = (row) => {
        setEditForm(row);

        setIsOpen((prev) => ({ ...prev, dispose: true }));
    };

    useEffect(() => {
        let t = items.map((row) => ({
            ...row,
            status: row.status === "active" ? "Active" : "Inactive",
            status_table: (
                <div className="flex gap-2 items-center">
                    {row.status === "active" ? (
                        <Chip
                            variant="success"
                            className="text-xs font-semibold py-0.5 px-2.5 rounded-full bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-200/60 dark:border-green-900/30"
                        >
                            Active
                        </Chip>
                    ) : (
                        <Chip
                            variant="danger"
                            className="text-xs font-semibold py-0.5 px-2.5 rounded-full bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200/60 dark:border-red-900/30"
                        >
                            Inactive
                        </Chip>
                    )}
                    {row.child_asset === 1 && (
                        <BsBox
                            className="text-neutral-500 dark:text-neutral-400 text-base flex-shrink-0"
                            title="Has child assets"
                        />
                    )}
                </div>
            ),
            action: (
                <div className="flex gap-2 w-20 items-center justify-center">
                    <Button
                        variant="ghost"
                        className="cursor-pointer h-8 w-8 rounded-full border border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 p-0 transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleEditClick(row);
                        }}
                        title="Edit Asset"
                    >
                        <MdEdit className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        className="cursor-pointer h-8 w-8 rounded-full border border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 p-0 transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDisposeClicked(row);
                        }}
                        title="Dispose Asset"
                    >
                        <FaTrash className="h-3.5 w-3.5" />
                    </Button>
                </div>
            ),
        }));
        setTableData(t);
    }, [items]);

    const onClickRow = (row) => {
        console.log(row);

        setIsOpen((prev) => ({ ...prev, view: true }));
        setEditForm({
            ...row,
            exp_date: row.exp_date ? new Date(row.exp_date) : undefined,
            assigned_submission: row.assigned_submission
                ? new Date(row.assigned_submission)
                : undefined,
            pis_date: row.pis_date ? new Date(row.pis_date) : undefined,
            child_assets:
                typeof row.child_assets == "string"
                    ? JSON.parse(row.child_assets)
                    : row.child_assets,
            child_assets_history:
                typeof row.child_assets_history == "string"
                    ? JSON.parse(row.child_assets_history)
                    : row.child_assets_history,
        });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setEditForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleUpdate = async () => {
        setLoading((prev) => ({ ...prev, update: true }));
        if (!editForm.asset_id || !validateAssetId(editForm.asset_id)) {
            toaster("error", "Invalid asset ID");
            return;
        }
        if (
            !editForm.serial ||
            editForm.serial.trim() === "" ||
            !editForm.type ||
            editForm.type.trim() === "" ||
            !editForm.model_no ||
            editForm.model_no.trim() === "" ||
            !editForm.asset_type ||
            editForm.asset_type.trim() === ""
        ) {
            toaster("error", "Please fill all required fields");
            return;
        }
        try {
            await apiService.put(`/assets/update/${editForm.id}`, {
                asset_id: editForm.asset_id,
                serial: editForm.serial,
                type: editForm.type,
                model_no: editForm.model_no,
                status: editForm.status,
                location: editForm.location,
                remarks: editForm.remarks,
                gl_account: editForm.gl_account,
                asset_code: editForm.asset_code,
                supplier_name: editForm.supplier_name,
                asset_criticality: editForm.asset_criticality,
                asset_type: editForm.asset_type,
                pis_date: editForm.pis_date
                    ? getSqlDate(new Date(editForm.pis_date))
                    : null,
                exp_date: editForm.exp_date
                    ? getSqlDate(new Date(editForm.exp_date))
                    : null,
                assigned_to: editForm.assigned_to,
                assigned_submission: editForm.assigned_submission
                    ? getSqlDate(new Date(editForm.assigned_submission))
                    : null,
                childAssets:
                    editForm.child_asset == 1
                        ? selectedChildAssets
                              .map((c) => (c.value ? Number(c.value) : null))
                              .filter(Boolean)
                        : [],
            });
            toaster("success", "Asset updated successfully");
            setIsOpen((prev) => ({ ...prev, edit: false }));
            fetchAssets();
        } catch (error) {
            toaster(
                "error",
                error.response?.data?.message ||
                    error.message ||
                    "Failed to update asset"
            );
        } finally {
            setLoading((prev) => ({ ...prev, update: false }));
        }
    };

    const handleBackup = async () => {
        setLoading((prev) => ({ ...prev, download: true }));
        try {
            await apiService.downloadFile("/assets/backup");
        } catch (error) {
            toaster("error", "Failed to create backup.");
        } finally {
            setLoading((prev) => ({ ...prev, download: false }));
        }
    };

    const handleDetag = async () => {
        setLoading((prev) => ({ ...prev, detag: true }));

        try {
            await apiService.post("/taggings/remove", {
                assetId: editForm.id,
                employeeId: editForm.emp_id,
            });
            const tempItems = items.map((item) => {
                if (item.id === editForm.id) {
                    return {
                        ...item,
                        emp_id: null,
                        emp_code: null,
                        name: null,
                        assigned_submission: null,
                        assigned_to: null,
                    };
                }
                return item;
            });
            setItems(tempItems);
            setEditForm((prev) => ({
                ...prev,
                emp_id: null,
                emp_code: null,
                name: null,
                assigned_submission: null,
                assigned_to: null,
            }));
            toaster("success", "Asset detagged successfully");
        } catch (error) {
            toaster("error", "Failed to detag asset.");
        } finally {
            setEditForm((prev) => ({ ...prev, emp_id: "" }));
            setLoading((prev) => ({ ...prev, detag: false }));
        }
    };

    const handleDispose = async () => {
        if (
            disposeDetails.disposalMethod === "sale" &&
            !disposeDetails.saleTo
        ) {
            toaster("error", "Please enter sale to");
            return;
        }
        if (
            disposeDetails.disposalMethod === "donation" &&
            !disposeDetails.donatedTo
        ) {
            toaster("error", "Please enter donated to");
            return;
        }
        if (
            disposeDetails.disposalMethod === "trash" &&
            !disposeDetails.trashTo
        ) {
            toaster("error", "Please enter trash to");
            return;
        }
        setLoading((prev) => ({ ...prev, dispose: true }));
        try {
            await apiService.post("/assets/dispose", {
                assetId: editForm.id,
                disposalDate: getSqlDate(new Date(disposeDetails.disposalDate)),
                disposalMethod: disposeDetails.disposalMethod,
                saleTo: disposeDetails.saleTo || null,
                donatedTo: disposeDetails.donatedTo || null,
                trashTo: disposeDetails.trashTo || null,
            });
            setDisposeDetails({
                disposalDate: new Date(),
                disposalMethod: "",
                saleTo: "",
                donatedTo: "",
                trashTo: "",
            });

            toaster("success", "Asset disposed successfully");
        } catch (error) {
            console.log(error);

            toaster("error", "Failed to dispose asset.");
        } finally {
            setIsOpen((prev) => ({ ...prev, dispose: false }));
            setLoading((prev) => ({ ...prev, dispose: false }));
        }
    };

    return (
        <div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400 flex items-center gap-2">
                        <Monitor className="h-6 w-6 text-blue-600 dark:text-blue-500" />
                        Asset List
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

            <div className="mb-6 flex items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                    <Input
                        type="text"
                        placeholder="Search by asset id, serial, model no, type or status..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="w-full pl-10 bg-white dark:bg-card border border-neutral-200 dark:border-neutral-800 rounded-lg focus:border-blue-500 dark:focus:border-blue-500 h-10 transition-all duration-150"
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
                modal={false}
                open={isOpen.edit}
                onOpenChange={(set) =>
                    setIsOpen((prev) => ({ ...prev, edit: set }))
                }
            >
                {isOpen.edit && (
                    <div className="fixed inset-0 z-40 bg-black/50" />
                )}
                <DialogContent
                    className="max-w-[90vw] w-[850px] max-h-[90vh] overflow-y-auto p-6"
                    onPointerDownOutside={() =>
                        setIsOpen((prev) => ({ ...prev, edit: false }))
                    }
                    unbounded
                >
                    <DialogHeader className="border-b border-border pb-4 mb-2">
                        <DialogTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                            Edit Asset Details
                        </DialogTitle>
                        <DialogDescription className="hidden" />
                    </DialogHeader>
                    <form className="space-y-6 mt-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Row 1 */}
                            <div>
                                <Label
                                    htmlFor="edit-asset-id"
                                    className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5 ms-1 flex items-center gap-0.5"
                                >
                                    Asset ID{" "}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="edit-asset-id"
                                    name="asset_id"
                                    value={editForm.asset_id}
                                    onChange={handleInputChange}
                                    placeholder="Enter Asset ID"
                                    className="w-full rounded-lg border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-muted/40 h-10 px-3.5"
                                    disabled={true}
                                />
                            </div>
                            <div>
                                <Label
                                    htmlFor="edit-serial"
                                    className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5 ms-1 flex items-center gap-0.5"
                                >
                                    Serial{" "}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="edit-serial"
                                    name="serial"
                                    placeholder="Enter Serial Number"
                                    value={editForm.serial}
                                    onChange={handleInputChange}
                                    className="w-full rounded-lg border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-muted/40 h-10 px-3.5"
                                    disabled={true}
                                />
                            </div>
                            <div>
                                <Label
                                    htmlFor="edit-asset-type"
                                    className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5 ms-1 flex items-center gap-0.5"
                                >
                                    Asset Type{" "}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                    name="asset_type"
                                    value={editForm.asset_type}
                                    onValueChange={(value) =>
                                        setEditForm((prev) => ({
                                            ...prev,
                                            asset_type: value,
                                        }))
                                    }
                                >
                                    <SelectTrigger
                                        id="edit-asset-type"
                                        className="w-full rounded-lg border-neutral-200 dark:border-neutral-800 bg-white dark:bg-card h-10 px-3.5 text-sm"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="it">IT</SelectItem>
                                        <SelectItem value="admin">
                                            Admin
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Row 2 */}
                            <div>
                                <Label
                                    htmlFor="edit-category"
                                    className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5 ms-1 flex items-center gap-0.5"
                                >
                                    Category{" "}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="edit-category"
                                    name="type"
                                    placeholder="Enter Asset Category"
                                    value={editForm.type}
                                    onChange={handleInputChange}
                                    className="w-full rounded-lg border-neutral-200 dark:border-neutral-800 bg-white dark:bg-card h-10 px-3.5 focus-visible:ring-1 focus-visible:ring-blue-500 transition-colors"
                                />
                            </div>
                            <div>
                                <Label
                                    htmlFor="edit-model"
                                    className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5 ms-1 flex items-center gap-0.5"
                                >
                                    Model No{" "}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="edit-model"
                                    name="model_no"
                                    placeholder="Enter Model Number"
                                    value={editForm.model_no}
                                    onChange={handleInputChange}
                                    className="w-full rounded-lg border-neutral-200 dark:border-neutral-800 bg-white dark:bg-card h-10 px-3.5 focus-visible:ring-1 focus-visible:ring-blue-500 transition-colors"
                                />
                            </div>
                            <div>
                                <Label
                                    htmlFor="edit-location"
                                    className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5 ms-1"
                                >
                                    Location
                                </Label>
                                <Input
                                    id="edit-location"
                                    name="location"
                                    placeholder="Enter Location"
                                    value={editForm.location}
                                    onChange={handleInputChange}
                                    className="w-full rounded-lg border-neutral-200 dark:border-neutral-800 bg-white dark:bg-card h-10 px-3.5 focus-visible:ring-1 focus-visible:ring-blue-500 transition-colors"
                                />
                            </div>

                            {/* Row 3 */}
                            <div>
                                <Label
                                    htmlFor="edit-gl-account"
                                    className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5 ms-1"
                                >
                                    GL Account
                                </Label>
                                <Input
                                    id="edit-gl-account"
                                    name="gl_account"
                                    placeholder="Enter GL Account"
                                    value={editForm.gl_account}
                                    onChange={handleInputChange}
                                    className="w-full rounded-lg border-neutral-200 dark:border-neutral-800 bg-white dark:bg-card h-10 px-3.5 focus-visible:ring-1 focus-visible:ring-blue-500 transition-colors"
                                />
                            </div>
                            <div>
                                <Label
                                    htmlFor="edit-asset-code"
                                    className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5 ms-1"
                                >
                                    US Unique Asset Code
                                </Label>
                                <Input
                                    id="edit-asset-code"
                                    name="asset_code"
                                    placeholder="Enter US Unique Asset Code"
                                    value={editForm.asset_code}
                                    onChange={handleInputChange}
                                    className="w-full rounded-lg border-neutral-200 dark:border-neutral-800 bg-white dark:bg-card h-10 px-3.5 focus-visible:ring-1 focus-visible:ring-blue-500 transition-colors"
                                />
                            </div>
                            <div>
                                <Label
                                    htmlFor="edit-supplier"
                                    className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5 ms-1"
                                >
                                    Supplier Name
                                </Label>
                                <Input
                                    id="edit-supplier"
                                    name="supplier_name"
                                    placeholder="Enter Supplier Name"
                                    value={editForm.supplier_name}
                                    onChange={handleInputChange}
                                    className="w-full rounded-lg border-neutral-200 dark:border-neutral-800 bg-white dark:bg-card h-10 px-3.5 focus-visible:ring-1 focus-visible:ring-blue-500 transition-colors"
                                />
                            </div>

                            {/* Row 4 */}
                            <div className="flex flex-col gap-1">
                                <Label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5 ms-1">
                                    Expiry Date
                                </Label>
                                <Button
                                    variant="outline"
                                    className="justify-start text-left font-normal w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-card h-10 px-3.5 hover:bg-neutral-50 dark:hover:bg-neutral-850 cursor-pointer text-sm"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (!isOpen.editCalendar) {
                                            setIsOpen((prev) => ({
                                                ...prev,
                                                editCalendar: true,
                                            }));
                                        }
                                    }}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4 text-neutral-400" />
                                    {editForm.exp_date ? (
                                        formatDate(new Date(editForm.exp_date))
                                    ) : (
                                        <span className="text-neutral-400">
                                            Select date
                                        </span>
                                    )}
                                </Button>
                            </div>
                            <div className="flex flex-col gap-1">
                                <Label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5 ms-1">
                                    PIS Date
                                </Label>
                                <Button
                                    variant="outline"
                                    className="justify-start text-left font-normal w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-card h-10 px-3.5 hover:bg-neutral-50 dark:hover:bg-neutral-850 cursor-pointer text-sm"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (!isOpen.pisCalendar) {
                                            setIsOpen((prev) => ({
                                                ...prev,
                                                pisCalendar: true,
                                            }));
                                        }
                                    }}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4 text-neutral-400" />
                                    {editForm.pis_date ? (
                                        formatDate(new Date(editForm.pis_date))
                                    ) : (
                                        <span className="text-neutral-400">
                                            Select date
                                        </span>
                                    )}
                                </Button>
                            </div>
                            <div>
                                <Label
                                    htmlFor="edit-status"
                                    className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5 ms-1"
                                >
                                    Status
                                </Label>
                                <Select
                                    name="status"
                                    value={editForm.status}
                                    onValueChange={(value) =>
                                        setEditForm((prev) => ({
                                            ...prev,
                                            status: value,
                                        }))
                                    }
                                >
                                    <SelectTrigger
                                        id="edit-status"
                                        className="w-full rounded-lg border-neutral-200 dark:border-neutral-800 bg-white dark:bg-card h-10 px-3.5 text-sm"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">
                                            Active
                                        </SelectItem>
                                        <SelectItem value="inactive">
                                            Inactive
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Row 5 */}
                            <div>
                                <Label
                                    htmlFor="edit-criticality"
                                    className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5 ms-1"
                                >
                                    Asset Criticality
                                </Label>
                                <Input
                                    id="edit-criticality"
                                    name="asset_criticality"
                                    placeholder="Asset Criticality Details"
                                    value={editForm.asset_criticality}
                                    onChange={handleInputChange}
                                    className="w-full rounded-lg border-neutral-200 dark:border-neutral-800 bg-white dark:bg-card h-10 px-3.5 focus-visible:ring-1 focus-visible:ring-blue-500 transition-colors"
                                />
                            </div>
                            {user?.role === "admin" && (
                                <div className="z-50">
                                    <Label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5 ms-1">
                                        Assign to
                                    </Label>
                                    <Combobox
                                        className="w-full border-border bg-white dark:bg-input"
                                        value={editForm.assigned_to}
                                        items={employees}
                                        hint="Select Employee"
                                        onChange={(val) =>
                                            setEditForm((prev) => ({
                                                ...prev,
                                                assigned_to: val,
                                            }))
                                        }
                                    />
                                </div>
                            )}
                            <div>
                                <Label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5 ms-1">
                                    Submission Date
                                </Label>
                                <Button
                                    variant="outline"
                                    className="justify-start text-left font-normal w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-card h-10 px-3.5 hover:bg-neutral-50 dark:hover:bg-neutral-850 cursor-pointer text-sm"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (!isOpen.submisstionCalendar) {
                                            setIsOpen((prev) => ({
                                                ...prev,
                                                submisstionCalendar: true,
                                            }));
                                        }
                                    }}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4 text-neutral-400" />
                                    {editForm.assigned_submission ? (
                                        formatDate(
                                            new Date(
                                                editForm.assigned_submission
                                            )
                                        )
                                    ) : (
                                        <span className="text-neutral-400">
                                            Select date
                                        </span>
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* Child Assets Config */}
                        <div className="pt-4 border-t border-border mt-6">
                            <div className="bg-neutral-50/50 dark:bg-neutral-900/10 p-4 sm:p-5 rounded-2xl border border-neutral-100 dark:border-neutral-850">
                                <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-3 ms-1">
                                    Child Assets Configuration
                                </p>
                                <div className="space-y-4">
                                    <div>
                                        <p className="mb-2.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                            Does this Asset have child assets?
                                        </p>
                                        <RadioGroup
                                            className="flex gap-6 ms-1"
                                            value={
                                                editForm.child_asset == 1
                                                    ? "yes"
                                                    : "no"
                                            }
                                            onValueChange={(val) => {
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    child_asset:
                                                        val == "yes" ? 1 : 0,
                                                }));
                                                if (val == "no") {
                                                    setSelectedChildAssets([]);
                                                } else if (
                                                    val == "yes" &&
                                                    selectedChildAssets.length ===
                                                        0
                                                ) {
                                                    setSelectedChildAssets([
                                                        {
                                                            id: Date.now(),
                                                            value: "",
                                                        },
                                                    ]);
                                                }
                                            }}
                                        >
                                            <div className="flex items-center gap-2">
                                                <RadioGroupItem
                                                    value="yes"
                                                    id="edit-yes"
                                                />
                                                <Label
                                                    htmlFor="edit-yes"
                                                    className="font-normal text-sm cursor-pointer text-neutral-700 dark:text-neutral-300"
                                                >
                                                    Yes
                                                </Label>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <RadioGroupItem
                                                    value="no"
                                                    id="edit-no"
                                                />
                                                <Label
                                                    htmlFor="edit-no"
                                                    className="font-normal text-sm cursor-pointer text-neutral-700 dark:text-neutral-300"
                                                >
                                                    No
                                                </Label>
                                            </div>
                                        </RadioGroup>
                                    </div>

                                    {editForm.child_asset == 1 && (
                                        <div className="space-y-3 pt-2">
                                            <Label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1 ms-1">
                                                Child Assets List
                                            </Label>
                                            {selectedChildAssets.map(
                                                (childAsset, index) => (
                                                    <div
                                                        key={
                                                            childAsset.id ||
                                                            index
                                                        }
                                                        className="flex items-center gap-3 bg-white dark:bg-card p-2 rounded-xl border border-neutral-150 dark:border-neutral-800"
                                                    >
                                                        <div className="flex-1 w-full">
                                                            <Combobox
                                                                items={allAssets.map(
                                                                    (a) => ({
                                                                        label: a.asset_id,
                                                                        value: String(
                                                                            a.id
                                                                        ),
                                                                    })
                                                                )}
                                                                value={String(
                                                                    childAsset.value ||
                                                                        ""
                                                                )}
                                                                onChange={(
                                                                    val
                                                                ) => {
                                                                    setSelectedChildAssets(
                                                                        (
                                                                            prev
                                                                        ) =>
                                                                            prev.map(
                                                                                (
                                                                                    item,
                                                                                    i
                                                                                ) =>
                                                                                    i ===
                                                                                    index
                                                                                        ? {
                                                                                              ...item,
                                                                                              value: val,
                                                                                          }
                                                                                        : item
                                                                            )
                                                                    );
                                                                }}
                                                                hint="Select Child Asset"
                                                            />
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            type="button"
                                                            className="cursor-pointer h-9 w-9 rounded-lg border border-neutral-100 dark:border-neutral-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                                            onClick={() => {
                                                                const newChildAssets =
                                                                    selectedChildAssets.filter(
                                                                        (
                                                                            _,
                                                                            i
                                                                        ) =>
                                                                            i !==
                                                                            index
                                                                    );
                                                                setSelectedChildAssets(
                                                                    newChildAssets
                                                                );
                                                            }}
                                                        >
                                                            <FiMinusCircle className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                )
                                            )}

                                            {(selectedChildAssets.length ===
                                                0 ||
                                                selectedChildAssets[
                                                    selectedChildAssets.length -
                                                        1
                                                ]?.value) && (
                                                <Button
                                                    variant="outline"
                                                    type="button"
                                                    className="cursor-pointer rounded-lg h-10 w-fit flex items-center gap-2 mt-2"
                                                    onClick={() =>
                                                        setSelectedChildAssets([
                                                            ...selectedChildAssets,
                                                            {
                                                                id: Date.now(),
                                                                value: "",
                                                            },
                                                        ])
                                                    }
                                                >
                                                    <IoAddCircleOutline className="h-4 w-4" />{" "}
                                                    Add Child Asset
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Remarks */}
                        <div className="space-y-1.5">
                            <Label
                                htmlFor="remarks"
                                className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider ms-1"
                            >
                                Remarks / Comments
                            </Label>
                            <Textarea
                                name="remarks"
                                value={editForm.remarks || ""}
                                onChange={handleInputChange}
                                id="remarks"
                                className="resize-none rounded-lg border-neutral-200 dark:border-neutral-800 bg-white dark:bg-card px-3.5 py-2 focus-visible:ring-1 focus-visible:ring-blue-500 transition-colors min-h-[80px]"
                                placeholder="Enter any additional remarks"
                            />
                        </div>
                    </form>
                    <DialogFooter className="flex-col sm:flex-row gap-2 mt-6 pt-4 border-t border-border">
                        <Button
                            className="cursor-pointer border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 w-full sm:w-[120px] transition-all hover:scale-[1.02] active:scale-[0.98]"
                            onClick={() => {
                                setIsOpen((prev) => ({
                                    ...prev,
                                    edit: false,
                                }));
                            }}
                            type="button"
                            variant="outline"
                        >
                            <X className="mr-2 h-4 w-4" /> Cancel
                        </Button>
                        {editForm.emp_code && (
                            <SpinnerButton
                                loading={loading.detag}
                                loadingText="Detagging..."
                                disabled={loading.detag || loading.update}
                                className="cursor-pointer border-red-600 text-red-600 hover:bg-red-600/10 hover:text-red-600 w-full sm:w-[120px] transition-all hover:scale-[1.02] active:scale-[0.98]"
                                onClick={handleDetag}
                                variant="outline"
                            >
                                Detag
                            </SpinnerButton>
                        )}
                        <SpinnerButton
                            loading={loading.update}
                            loadingText="Updating..."
                            disabled={loading.detag || loading.update}
                            className="cursor-pointer border-primary text-primary hover:bg-primary/10 hover:text-primary w-full sm:w-[120px] transition-all hover:scale-[1.02] active:scale-[0.98]"
                            onClick={handleUpdate}
                            variant="outline"
                        >
                            <Check className="mr-2 h-4 w-4" /> Update
                        </SpinnerButton>
                    </DialogFooter>

                    <Dialog
                        open={isOpen.editCalendar}
                        onOpenChange={(set) =>
                            setIsOpen((prev) => ({ ...prev, editCalendar: set }))
                        }
                    >
                        <DialogContent
                            className="[&>button.absolute]:hidden w-[300px]"
                            onPointerDownOutside={() =>
                                setIsOpen((prev) => ({ ...prev, editCalendar: false }))
                            }
                        >
                            <DialogTitle className="hidden" />
                            <DialogDescription className="hidden" />
                            <Calendar
                                mode="single"
                                selected={editForm.exp_date}
                                onSelect={(e) => {
                                    setEditForm((prev) => ({ ...prev, exp_date: e }));
                                    setIsOpen((prev) => ({
                                        ...prev,
                                        editCalendar: false,
                                        edit: true,
                                    }));
                                }}
                                startMonth={new Date()}
                                toYear={2100}
                                captionLayout="dropdown"
                            />
                        </DialogContent>
                    </Dialog>
                    <Dialog
                        open={isOpen.pisCalendar}
                        onOpenChange={(set) =>
                            setIsOpen((prev) => ({ ...prev, pisCalendar: set }))
                        }
                    >
                        <DialogContent
                            className="[&>button.absolute]:hidden w-[300px]"
                            onPointerDownOutside={() =>
                                setIsOpen((prev) => ({ ...prev, pisCalendar: false }))
                            }
                        >
                            <DialogTitle className="hidden" />
                            <DialogDescription className="hidden" />
                            <Calendar
                                mode="single"
                                selected={editForm.pis_date}
                                onSelect={(e) => {
                                    setEditForm((prev) => ({ ...prev, pis_date: e }));
                                    setIsOpen((prev) => ({
                                        ...prev,
                                        pisCalendar: false,
                                        edit: true,
                                    }));
                                }}
                                startMonth={new Date(2020, 0)}
                                toYear={2100}
                                captionLayout="dropdown"
                            />
                        </DialogContent>
                    </Dialog>
                    <Dialog
                        open={isOpen.submisstionCalendar}
                        onOpenChange={(set) =>
                            setIsOpen((prev) => ({ ...prev, submisstionCalendar: set }))
                        }
                    >
                        <DialogContent
                            className="[&>button.absolute]:hidden w-[300px]"
                            onPointerDownOutside={() =>
                                setIsOpen((prev) => ({
                                    ...prev,
                                    submisstionCalendar: false,
                                }))
                            }
                        >
                            <DialogTitle className="hidden" />
                            <DialogDescription className="hidden" />
                            <Calendar
                                mode="single"
                                selected={editForm.assigned_submission}
                                onSelect={(e) => {
                                    setEditForm((prev) => ({
                                        ...prev,
                                        assigned_submission: e,
                                    }));
                                    setIsOpen((prev) => ({
                                        ...prev,
                                        submisstionCalendar: false,
                                        edit: true,
                                    }));
                                }}
                                startMonth={new Date()}
                                toYear={2100}
                                captionLayout="dropdown"
                            />
                        </DialogContent>
                    </Dialog>
                </DialogContent>
            </Dialog>
            <Dialog
                open={isOpen.view}
                onOpenChange={(set) =>
                    setIsOpen((prev) => ({ ...prev, view: set }))
                }
            >
                <DialogContent
                    className={cn(
                        "max-w-[90vw] w-[500px] max-h-[90vh] overflow-y-auto p-6",
                        (editForm.child_asset === 1 ||
                            (editForm.child_assets_history &&
                                editForm.child_assets_history.length > 0)) &&
                            "max-w-[95vw] w-[900px]"
                    )}
                    onPointerDownOutside={() =>
                        setIsOpen((prev) => ({ ...prev, view: false }))
                    }
                    unbounded
                >
                    <DialogHeader className="border-b border-border pb-4 mb-2">
                        <DialogTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                            Asset Details
                        </DialogTitle>
                        <DialogDescription className="hidden" />
                    </DialogHeader>

                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className={cn(
                            "flex flex-col gap-5 mt-4",
                            (editForm.child_asset === 1 ||
                                (editForm.child_assets_history &&
                                    editForm.child_assets_history.length >
                                        0)) &&
                                "lg:flex-row w-full"
                        )}
                    >
                        {/* Column 1: Primary Asset Details */}
                        <div
                            className={cn(
                                "w-full flex flex-col gap-4",
                                (editForm.child_asset === 1 ||
                                    (editForm.child_assets_history &&
                                        editForm.child_assets_history.length >
                                            0)) &&
                                    "lg:w-1/2"
                            )}
                        >
                            {/* Asset Information Card */}
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
                                            {editForm.asset_id || "N/A"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                            Serial
                                        </span>
                                        <span className="text-sm font-semibold text-foreground">
                                            {editForm.serial || "N/A"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                            Category
                                        </span>
                                        <span className="text-sm font-medium text-foreground">
                                            {editForm.type || "N/A"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                            Model No
                                        </span>
                                        <span className="text-sm font-medium text-foreground">
                                            {editForm.model_no || "N/A"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                            Status
                                        </span>
                                        <div className="mt-1">
                                            <span
                                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider border ${
                                                    editForm.status?.toLowerCase() ===
                                                        "active" ||
                                                    editForm.status?.toLowerCase() ===
                                                        "allocated" ||
                                                    editForm.status?.toLowerCase() ===
                                                        "tagged"
                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                                                        : editForm.status?.toLowerCase() ===
                                                            "maintenance"
                                                          ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
                                                          : "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20"
                                                }`}
                                            >
                                                <span
                                                    className={`h-1.5 w-1.5 rounded-full ${
                                                        editForm.status?.toLowerCase() ===
                                                            "active" ||
                                                        editForm.status?.toLowerCase() ===
                                                            "allocated" ||
                                                        editForm.status?.toLowerCase() ===
                                                            "tagged"
                                                            ? "bg-emerald-500"
                                                            : editForm.status?.toLowerCase() ===
                                                                "maintenance"
                                                              ? "bg-amber-500"
                                                              : "bg-slate-500"
                                                    }`}
                                                />
                                                {editForm.status || "N/A"}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                            Location
                                        </span>
                                        <span className="text-sm font-medium text-foreground">
                                            {editForm.location || "N/A"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                            GL Account
                                        </span>
                                        <span className="text-sm font-medium text-foreground">
                                            {editForm.gl_account || "--"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                            Unique Asset Code
                                        </span>
                                        <span className="text-sm font-medium text-foreground">
                                            {editForm.asset_code || "--"}
                                        </span>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                            Supplier Name
                                        </span>
                                        <span className="text-sm font-medium text-foreground">
                                            {editForm.supplier_name || "--"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                            Expiry Date
                                        </span>
                                        <span className="text-sm font-medium text-foreground">
                                            {editForm.exp_date
                                                ? formatDate(editForm.exp_date)
                                                : "N/A"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                            PIS Date
                                        </span>
                                        <span className="text-sm font-medium text-foreground">
                                            {editForm.pis_date
                                                ? formatDate(editForm.pis_date)
                                                : "N/A"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                            Asset Criticality
                                        </span>
                                        <span className="text-sm font-medium text-foreground">
                                            {editForm.asset_criticality ||
                                                "N/A"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                            Asset Type
                                        </span>
                                        <span className="text-sm font-semibold text-foreground uppercase">
                                            {editForm.asset_type || "N/A"}
                                        </span>
                                    </div>

                                    {editForm.remarks && (
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
                                                    {editForm.remarks}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Allocation details Card (if assigned) */}
                            {editForm.name && (
                                <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                                    <div className="flex items-center gap-2.5 border-b border-border pb-3 mb-4">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                            <User size={18} />
                                        </div>
                                        <h4 className="font-semibold text-base text-foreground">
                                            Allocation Details
                                        </h4>
                                    </div>

                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-primary/60 text-primary-foreground font-bold shadow text-xs">
                                                {getInitials(editForm.name)}
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-foreground">
                                                    {editForm.name}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    ID: {editForm.emp_code}
                                                </div>
                                            </div>
                                        </div>
                                        {editForm.assigned_submission && (
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
                                                            editForm.assigned_submission
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Column 2: Child Assets & History (if present) */}
                        {(editForm.child_asset === 1 ||
                            (editForm.child_assets_history &&
                                editForm.child_assets_history.length > 0)) && (
                            <div className="w-full lg:w-1/2 flex flex-col gap-4">
                                {/* Current Child Assets */}
                                {editForm.child_asset === 1 &&
                                    editForm.child_assets &&
                                    editForm.child_assets.length > 0 && (
                                        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                                            <div className="flex items-center gap-2.5 border-b border-border pb-3 mb-3">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                    <Layers size={18} />
                                                </div>
                                                <h4 className="font-semibold text-base text-foreground">
                                                    Current Child Assets
                                                </h4>
                                            </div>

                                            <div className="overflow-x-auto">
                                                <Table className="min-w-full">
                                                    <TableBody>
                                                        <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border">
                                                            <TableCell className="font-semibold text-xs py-2 uppercase tracking-wider text-muted-foreground">
                                                                Asset ID
                                                            </TableCell>
                                                            <TableCell className="font-semibold text-xs py-2 uppercase tracking-wider text-muted-foreground">
                                                                Type
                                                            </TableCell>
                                                            <TableCell className="font-semibold text-xs py-2 uppercase tracking-wider text-muted-foreground">
                                                                Serial
                                                            </TableCell>
                                                            <TableCell className="font-semibold text-xs py-2 uppercase tracking-wider text-muted-foreground">
                                                                Model No
                                                            </TableCell>
                                                        </TableRow>
                                                        {editForm.child_assets.map(
                                                            (child) => (
                                                                <TableRow
                                                                    key={
                                                                        child.id
                                                                    }
                                                                    className="hover:bg-muted/20 border-b border-border"
                                                                >
                                                                    <TableCell className="text-sm py-2 font-semibold">
                                                                        {
                                                                            child.asset_id
                                                                        }
                                                                    </TableCell>
                                                                    <TableCell className="text-sm py-2 text-muted-foreground">
                                                                        {
                                                                            child.type
                                                                        }
                                                                    </TableCell>
                                                                    <TableCell className="text-sm py-2 text-muted-foreground">
                                                                        {
                                                                            child.serial
                                                                        }
                                                                    </TableCell>
                                                                    <TableCell className="text-sm py-2 text-muted-foreground">
                                                                        {
                                                                            child.model_no
                                                                        }
                                                                    </TableCell>
                                                                </TableRow>
                                                            )
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </div>
                                    )}

                                {/* Child Assets History */}
                                {editForm.child_assets_history &&
                                    editForm.child_assets_history.length >
                                        0 && (
                                        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                                            <div className="flex items-center gap-2.5 border-b border-border pb-3 mb-3">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                    <History size={18} />
                                                </div>
                                                <h4 className="font-semibold text-base text-foreground">
                                                    Child Assets History
                                                </h4>
                                            </div>

                                            <div className="overflow-x-auto">
                                                <Table className="min-w-full">
                                                    <TableBody>
                                                        <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border">
                                                            <TableCell className="font-semibold text-xs py-2 uppercase tracking-wider text-muted-foreground">
                                                                Asset ID
                                                            </TableCell>
                                                            <TableCell className="font-semibold text-xs py-2 uppercase tracking-wider text-muted-foreground">
                                                                Type
                                                            </TableCell>
                                                            <TableCell className="font-semibold text-xs py-2 uppercase tracking-wider text-muted-foreground">
                                                                Serial
                                                            </TableCell>
                                                            <TableCell className="font-semibold text-xs py-2 uppercase tracking-wider text-muted-foreground">
                                                                Model No
                                                            </TableCell>
                                                        </TableRow>
                                                        {editForm.child_assets_history.map(
                                                            (child) => (
                                                                <TableRow
                                                                    key={
                                                                        child.id
                                                                    }
                                                                    className="hover:bg-muted/20 border-b border-border"
                                                                >
                                                                    <TableCell className="text-sm py-2 font-semibold">
                                                                        {
                                                                            child.asset_id
                                                                        }
                                                                    </TableCell>
                                                                    <TableCell className="text-sm py-2 text-muted-foreground">
                                                                        {
                                                                            child.type
                                                                        }
                                                                    </TableCell>
                                                                    <TableCell className="text-sm py-2 text-muted-foreground">
                                                                        {
                                                                            child.serial
                                                                        }
                                                                    </TableCell>
                                                                    <TableCell className="text-sm py-2 text-muted-foreground">
                                                                        {
                                                                            child.model_no
                                                                        }
                                                                    </TableCell>
                                                                </TableRow>
                                                            )
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </div>
                                    )}
                            </div>
                        )}
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
            <Dialog
                open={isOpen.dispose}
                onOpenChange={(set) =>
                    setIsOpen((prev) => ({ ...prev, dispose: set }))
                }
            >
                <DialogContent
                    className="max-w-[90vw] w-[500px]"
                    onPointerDownOutside={() =>
                        setIsOpen((prev) => ({ ...prev, dispose: false }))
                    }
                    unbounded
                    onCloseAutoFocus={() => {
                        setDisposeDetails({
                            disposalDate: new Date(),
                            disposalMethod: "",
                            salePrice: "",
                            donatedTo: "",
                        });
                    }}
                >
                    <DialogHeader>
                        <DialogTitle className="text-lg sm:text-xl">
                            Dispose Asset
                        </DialogTitle>
                        <DialogDescription className="hidden" />
                    </DialogHeader>
                    <div>
                        <table className="w-full">
                            <tbody>
                                <tr>
                                    <td className="p-2 w-40">
                                        <p>
                                            Disposal Date{" "}
                                            <span className="text-red-500">
                                                *
                                            </span>
                                        </p>
                                    </td>
                                    <td>
                                        <Button
                                            variant="outline"
                                            className="justify-start text-left font-normal w-full"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                if (!isOpen.editCalendar) {
                                                    setIsOpen((prev) => ({
                                                        ...prev,
                                                        disposeCalendar: true,
                                                    }));
                                                }
                                            }}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {disposeDetails.disposalDate
                                                ? formatDate(
                                                      new Date(
                                                          disposeDetails.disposalDate
                                                      )
                                                  )
                                                : "Select date"}
                                        </Button>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="p-2 pt-6 w-40">
                                        <p>
                                            Disposal Method{" "}
                                            <span className="text-red-500">
                                                *
                                            </span>{" "}
                                        </p>
                                    </td>
                                    <td className="pt-4">
                                        <Select
                                            value={
                                                disposeDetails.disposalMethod
                                            }
                                            onValueChange={(value) => {
                                                setDisposeDetails((prev) => ({
                                                    ...prev,
                                                    saleTo: "",
                                                    donatedTo: "",
                                                    trashTo: "",
                                                    disposalMethod: value,
                                                }));
                                            }}
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select disposal method" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectGroup>
                                                    <SelectItem value="sale">
                                                        Sale
                                                    </SelectItem>
                                                    <SelectItem value="donation">
                                                        Donation
                                                    </SelectItem>
                                                    <SelectItem value="recycled">
                                                        Recycled
                                                    </SelectItem>
                                                    <SelectItem value="trash">
                                                        Trash
                                                    </SelectItem>
                                                </SelectGroup>
                                            </SelectContent>
                                        </Select>
                                    </td>
                                </tr>
                                {disposeDetails.disposalMethod === "sale" && (
                                    <tr>
                                        <td className="p-2 pt-6 w-40">
                                            <p>
                                                Sale to{" "}
                                                <span className="text-red-500">
                                                    *
                                                </span>{" "}
                                            </p>
                                        </td>
                                        <td className="pt-4">
                                            <Input
                                                type="text"
                                                placeholder="Enter sale to"
                                                value={disposeDetails.saleTo}
                                                onChange={(e) => {
                                                    setDisposeDetails(
                                                        (prev) => ({
                                                            ...prev,
                                                            saleTo: e.target
                                                                .value,
                                                        })
                                                    );
                                                }}
                                            />
                                        </td>
                                    </tr>
                                )}
                                {disposeDetails.disposalMethod ===
                                    "donation" && (
                                    <tr>
                                        <td className="p-2 pt-6 w-40">
                                            <p>
                                                Donated to{" "}
                                                <span className="text-red-500">
                                                    *
                                                </span>{" "}
                                            </p>
                                        </td>
                                        <td className="pt-4">
                                            <Input
                                                type="text"
                                                placeholder="Enter donated to"
                                                value={disposeDetails.donatedTo}
                                                onChange={(e) => {
                                                    setDisposeDetails(
                                                        (prev) => ({
                                                            ...prev,
                                                            donatedTo:
                                                                e.target.value,
                                                        })
                                                    );
                                                }}
                                            />
                                        </td>
                                    </tr>
                                )}
                                {disposeDetails.disposalMethod === "trash" && (
                                    <tr>
                                        <td className="p-2 pt-6 w-40">
                                            <p>
                                                Trash to{" "}
                                                <span className="text-red-500">
                                                    *
                                                </span>{" "}
                                            </p>
                                        </td>
                                        <td className="pt-4">
                                            <Input
                                                type="text"
                                                placeholder="Enter trash to"
                                                value={disposeDetails.trashTo}
                                                onChange={(e) => {
                                                    setDisposeDetails(
                                                        (prev) => ({
                                                            ...prev,
                                                            trashTo:
                                                                e.target.value,
                                                        })
                                                    );
                                                }}
                                            />
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-center justify-end mt-6">
                            <Button
                                variant="outline"
                                className="cursor-pointer w-full sm:w-auto"
                                onClick={() =>
                                    setIsOpen((prev) => ({
                                        ...prev,
                                        dispose: false,
                                    }))
                                }
                            >
                                Cancel
                            </Button>
                            <SpinnerButton
                                variant="default"
                                className="cursor-pointer w-full sm:w-auto"
                                onClick={handleDispose}
                                loading={loading.dispose}
                                loadingText="Disposing..."
                                disabled={loading.dispose}
                            >
                                Dispose
                            </SpinnerButton>
                        </div>
                    </div>

                    <Dialog
                        open={isOpen.disposeCalendar}
                        onOpenChange={(set) =>
                            setIsOpen((prev) => ({ ...prev, disposeCalendar: set }))
                        }
                    >
                        <DialogContent
                            className="[&>button.absolute]:hidden w-[300px]"
                            onPointerDownOutside={() =>
                                setIsOpen((prev) => ({
                                    ...prev,
                                    disposeCalendar: false,
                                }))
                            }
                        >
                            <DialogTitle className="hidden" />
                            <DialogDescription className="hidden" />
                            <Calendar
                                mode="single"
                                selected={disposeDetails.disposalDate}
                                onSelect={(e) => {
                                    setDisposeDetails((prev) => ({
                                        ...prev,
                                        disposalDate: e,
                                    }));
                                    setIsOpen((prev) => ({
                                        ...prev,
                                        disposeCalendar: false,
                                        dispose: true,
                                    }));
                                }}
                                startMonth={new Date()}
                                toYear={2100}
                                captionLayout="dropdown"
                            />
                        </DialogContent>
                    </Dialog>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AssetList;
