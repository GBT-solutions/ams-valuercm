import { useContext, useState, useEffect } from "react";
import Papa from "papaparse";
import { useNavigate } from "react-router";
import { FiMinusCircle } from "react-icons/fi";
import { IoAddCircleOutline } from "react-icons/io5";
import { motion, AnimatePresence } from "framer-motion";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar } from "../components/ui/calendar";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
    DialogHeader,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SpinnerButton from "@/components/ui/spinner-button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../components/ui/table";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "../components/ui/select";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import {
    CalendarIcon,
    UploadCloud,
    FileText,
    Download,
    AlertCircle,
    Plus,
} from "lucide-react";
import {
    capitalizeWords,
    formatDate,
    getSqlDate,
    validateAssetId,
    validateSerialNumber,
    validateStatus,
} from "../utils/helperFunctions";
import apiService from "../utils/apiService";
import toaster from "../utils/toaster";
import { CustomComboBox } from "../components/CustomComboBox";
import Combobox from "../components/Combobox";
import { Context } from "../utils/Context";
import { cn } from "../lib/utils";

export default function AddAsset() {
    const navigate = useNavigate();
    const { products } = useContext(Context);
    const [activeTab, setActiveTab] = useState("Single");
    const [formData, setFormData] = useState({
        assetId: "",
        serial: "",
        type: "",
        modelNo: "",
        location: "",
        expDate: "",
        remarks: "",
        pisDate: "",
        glAccount: "",
        assetCode: "",
        supplierName: "",
        assetCriticality: "",
        assetType: "",
        child_asset: 0,
    });

    const [pisDate, setpisDate] = useState();
    const [expDate, setExpDate] = useState();
    const today = new Date();
    const minExpDate = new Date(today.getFullYear() - 5, 0, 1);
    const maxExpDate = new Date(today.getFullYear() + 25, 11, 31);
    const [isOpen, setIsOpen] = useState({ expDate: false, pisDate: false });
    const [loading, setLoading] = useState(false);
    const [csvFile, setCsvFile] = useState(null);
    const [csvData, setCsvData] = useState([]);
    const [csvErrors, setCsvErrors] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [booleanStates, setBooleanStates] = useState({
        errorDialog: false,
        isUploading: false,
        resultsDialog: false,
    });
    const [uploadResults, setUploadResults] = useState(null);
    const [allAssets, setAllAssets] = useState([]);
    const [selectedChildAssets, setSelectedChildAssets] = useState([]);

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

    useEffect(() => {
        if (formData.child_asset == 1 && selectedChildAssets.length === 0) {
            setSelectedChildAssets([{ id: Date.now(), value: "" }]);
        }
    }, [formData.child_asset, selectedChildAssets.length]);

    const handleChange = (key, value) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async () => {
        const { assetId, serial, type, modelNo, assetType } = formData;
        if (!assetId || !serial || !type || !modelNo || !assetType) {
            toaster("error", "Please fill all required fields.");
            return;
        }
        if (!validateAssetId(assetId.trim()?.toUpperCase())) {
            toaster("error", "Invalid Asset ID format.");
            return;
        }
        if (!validateSerialNumber(serial.trim()?.toLocaleUpperCase())) {
            toaster("error", "Invalid Serial Number format.");
            return;
        }

        const payload = {
            ...formData,
            pisDate: pisDate ? getSqlDate(pisDate) : null,
            expDate: expDate ? getSqlDate(expDate) : null,
            assetId: assetId.trim()?.toUpperCase(),
            serial: serial.trim()?.toUpperCase(),
            type: capitalizeWords(type.trim()),
            modelNo: modelNo.trim(),
            location: capitalizeWords(formData.location.trim()),
            remarks: formData.remarks.trim(),
            supplierName: formData.supplierName.trim(),
            assetCode: formData.assetCode.trim(),
            glAccount: formData.glAccount.trim(),
            assetCriticality: formData.assetCriticality.trim(),
            assetType: formData.assetType.trim(),
            childAssets:
                formData.child_asset == 1
                    ? selectedChildAssets
                          .map((c) => (c.value ? Number(c.value) : null))
                          .filter(Boolean)
                    : [],
        };

        try {
            setLoading(true);
            await apiService.post("/assets/add", payload);
            toaster("success", "Asset added successfully!");

            setFormData({
                assetId: "",
                serial: "",
                type: "",
                modelNo: "",
                location: "",
                expDate: "",
                pisDate: "",
                remarks: "",
                glAccount: "",
                assetCode: "",
                supplierName: "",
                assetCriticality: "",
                assetType: "",
                child_asset: 0,
            });
            setSelectedChildAssets([]);
            setExpDate(undefined);
            navigate("/asset-list");
        } catch (err) {
            const msg =
                err?.response?.data?.message ||
                err.message ||
                "Something went wrong";
            toaster("error", msg);
        } finally {
            setLoading(false);
        }
    };

    const handleCSVSubmit = async (e) => {
        e.preventDefault();
        if (csvErrors.length > 0) {
            setBooleanStates((prev) => ({
                ...prev,
                errorDialog: true,
            }));
            return;
        }

        if (csvFile) {
            await uploadFile();
        }
    };

    const changeDateFormat = (dateString) => {
        const [day, month, year] = dateString.split("-");
        if (!day || !month || !year) return null;
        if (year.length !== 4) return dateString;
        return `${year}-${month}-${day}`;
    };

    const processCsvFile = (file) => {
        if (!file || file.type !== "text/csv") {
            toaster("error", "Please select a valid CSV file");
            return;
        }

        setCsvFile(file);

        Papa.parse(file, {
            header: true, // First row becomes keys
            skipEmptyLines: true,
            transformHeader: (header) => header.trim().toLowerCase(),
            complete: (results) => {
                const data = results.data;
                const errors = [];

                // Header normalization mapping
                const headerMap = {
                    asset_id: "asset_id",
                    assetid: "asset_id",
                    serial: "serial",
                    serial_no: "serial",
                    serialnumber: "serial",
                    type: "type",
                    model_no: "model_no",
                    model: "model_no",
                    modelnumber: "model_no",
                    status: "status",
                    location: "location",
                    exp_date: "exp_date",
                    expiry_date: "exp_date",
                    expiration: "exp_date",
                    remarks: "remarks",
                    Pis_date: "pis_date",
                    Pisdate: "pis_date",
                    Supplier_name: "supplier_name",
                    asset_code: "us_asset_code",
                    us_asset_code: "us_asset_code",
                    gl_account: "gl_account",
                    asset_criticality: "asset_criticality",
                    category: "category",
                    child_assets: "child_assets",
                };

                // Normalize keys
                const normalizedData = data.map((row) => {
                    const normalized = {};
                    Object.keys(row).forEach((key) => {
                        const mappedKey = headerMap[key] || key;
                        normalized[mappedKey] = row[key]?.trim();
                    });
                    return normalized;
                });

                // Required fields check
                const requiredFields = [
                    "asset_id",
                    "serial",
                    "type",
                    "model_no",
                ];
                const missingHeaders = requiredFields.filter(
                    (field) =>
                        !Object.keys(normalizedData[0] || {}).includes(field)
                );

                if (missingHeaders.length > 0) {
                    errors.push({
                        type: "missing required headers",
                        message: `Missing required headers: ${missingHeaders.join(", ")}.`,
                    });
                    setCsvData([]);
                    setCsvErrors(errors);
                    return;
                }

                // Row validation
                const validData = [];
                normalizedData.forEach((row, index) => {
                    const lineNumber = index + 2; // account for header line
                    let rowHasError = false;

                    // validations
                    if (!row.asset_id || !validateAssetId(row.asset_id)) {
                        errors.push({
                            type: "invalid asset_id",
                            message: `Invalid Asset ID at line ${lineNumber}`,
                        });
                        rowHasError = true;
                    }
                    if (!row.serial || !validateSerialNumber(row.serial)) {
                        errors.push({
                            type: "invalid serial",
                            message: `Invalid Serial Number at line ${lineNumber}`,
                        });
                        rowHasError = true;
                    }
                    if (!row.type) {
                        errors.push({
                            type: "missing type",
                            message: `Type is required at line ${lineNumber}`,
                        });
                        rowHasError = true;
                    }
                    if (!row.model_no) {
                        errors.push({
                            type: "missing model_no",
                            message: `Model No is required at line ${lineNumber}`,
                        });
                        rowHasError = true;
                    }
                    if (row.gl_account) {
                        errors.push({
                            type: "missing gl_account",
                            message: `GL Account is required at line ${lineNumber}`,
                        });
                        rowHasError = true;
                    }
                    if (row.asset_code) {
                        errors.push({
                            type: "missing asset_code",
                            message: `Asset Code is required at line ${lineNumber}`,
                        });
                        rowHasError = true;
                    }
                    if (row.supplier_name) {
                        errors.push({
                            type: "missing supplier_name",
                            message: `Supplier Name is required at line ${lineNumber}`,
                        });
                        rowHasError = true;
                    }
                    if (
                        row.status &&
                        !validateStatus(row.status.toLowerCase())
                    ) {
                        errors.push({
                            type: "invalid status",
                            message: `Invalid status at line ${lineNumber}`,
                        });
                        rowHasError = true;
                    }

                    if (row.exp_date) {
                        const date = new Date(changeDateFormat(row.exp_date));
                        if (isNaN(date.getTime())) {
                            errors.push({
                                type: "invalid exp_date",
                                message: `Invalid Expiry Date at line ${lineNumber}`,
                            });
                            rowHasError = true;
                        } else {
                            row.exp_date = formatDate(date);
                        }
                    }
                    if (row.pis_date) {
                        const date = new Date(changeDateFormat(row.pis_date));
                        if (isNaN(date.getTime())) {
                            errors.push({
                                type: "invalid pis_date",
                                message: `Invalid pis Date at line ${lineNumber}`,
                            });
                            rowHasError = true;
                        } else {
                            row.pis_date = formatDate(date);
                        }
                    }
                    if (row.asset_criticality) {
                        errors.push({
                            type: "missing asset_criticality",
                            message: `Asset Criticality is required at line ${lineNumber}`,
                        });
                        rowHasError = true;
                    }
                    if (row.asset_type) {
                        errors.push({
                            type: "missing asset_type",
                            message: `Asset Type is required at line ${lineNumber}`,
                        });
                        rowHasError = true;
                    }

                    if (row.child_assets) {
                        const children = row.child_assets
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean);
                        const invalidChildren = children.filter(
                            (c) => !validateAssetId(c)
                        );
                        if (invalidChildren.length > 0) {
                            errors.push({
                                type: "invalid child_assets",
                                message: `Invalid Child Asset IDs (${invalidChildren.join(", ")}) at line ${lineNumber}`,
                            });
                            rowHasError = true;
                        }
                    }

                    // if (!rowHasError)
                    validData.push(row);
                });

                setCsvData(normalizedData);
                setCsvErrors([]);
            },
        });
    };

    const handleCsvFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            processCsvFile(file);
        }
    };

    const uploadFile = async () => {
        setBooleanStates((prev) => ({
            ...prev,
            errorDialog: false,
            isUploading: true,
        }));

        try {
            const response = await apiService.uploadFile(
                "/assets/upload-csv",
                csvFile
            );
            if (response.success) {
                toaster("success", "File uploaded successfully!");

                // Set upload results for dialog
                console.log("Upload Results:", response.data);

                setUploadResults(response.data);
                setBooleanStates((prev) => ({
                    ...prev,
                    resultsDialog: true,
                }));

                // Clear form after successful upload
                setCsvFile(null);
                setCsvData([]);
                setCsvErrors([]);

                // Clear file input
                const fileInput = document.getElementById("csvFile");
                if (fileInput) {
                    fileInput.value = "";
                }
            } else {
                toaster("error", response.message || "Upload failed");
            }
        } catch (error) {
            const errorMessage =
                error.response?.data?.message ||
                "Upload failed. Please try again.";
            toaster("error", errorMessage);
        } finally {
            setBooleanStates((prev) => ({
                ...prev,
                isUploading: false,
            }));
        }
    };

    const sendCsvFile = async () => {
        await uploadFile();
    };

    const handleSampleCsv = async () => {
        try {
            await apiService.downloadFile(
                "/assets/sample-csv",
                "sample_assets.csv"
            );
        } catch (error) {
            const errorMessage =
                error.response?.data?.message ||
                "Failed to download sample CSV";
            toaster("error", errorMessage);
        }
    };

    return (
        <div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400 flex items-center gap-2">
                        <Plus className="h-6 w-6 text-blue-600 dark:text-blue-500" />
                        Add Assets
                    </h2>
                </div>
            </div>

            <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
            >
                <div className="flex justify-start mb-6">
                    <TabsList className="flex p-1 bg-neutral-100 dark:bg-neutral-900/60 rounded-xl w-full sm:w-auto">
                        <TabsTrigger
                            className="cursor-pointer flex-1 sm:flex-none sm:w-36 py-2 px-6 rounded-lg text-sm font-medium transition-all duration-150 data-[state=active]:bg-white dark:data-[state=active]:bg-card data-[state=active]:text-neutral-900 dark:data-[state=active]:text-neutral-100 data-[state=active]:shadow-xs text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 border-none"
                            value="Single"
                        >
                            Single Entry
                        </TabsTrigger>
                        <TabsTrigger
                            className="cursor-pointer flex-1 sm:flex-none sm:w-36 py-2 px-6 rounded-lg text-sm font-medium transition-all duration-150 data-[state=active]:bg-white dark:data-[state=active]:bg-card data-[state=active]:text-neutral-900 dark:data-[state=active]:text-neutral-100 data-[state=active]:shadow-xs text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 border-none"
                            value="Bulk"
                        >
                            Bulk Upload
                        </TabsTrigger>
                    </TabsList>
                </div>

                <AnimatePresence mode="wait" initial={false}>
                    {activeTab === "Single" && (
                        <TabsContent
                            key="Single"
                            value="Single"
                            forceMount
                            className="flex flex-col w-full max-h-[calc(100vh-16rem)] gap-4 mb-6"
                            style={{ display: "flex" }}
                        >
                            <motion.div
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: 20, opacity: 0 }}
                                transition={{
                                    duration: 0.2,
                                    ease: "easeInOut",
                                }}
                                className="w-full"
                            >
                                <div className="w-full max-w-5xl mt-1 mx-auto p-6 sm:p-8 bg-white dark:bg-card rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 shadow-md shadow-slate-100/40 dark:shadow-none space-y-6 mb-6">
                                    {/* Section 1: Identification & Category */}
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            <div>
                                                <Label
                                                    htmlFor="assetId"
                                                    className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5 ms-1 flex items-center gap-0.5"
                                                >
                                                    Asset ID{" "}
                                                    <span className="text-red-500">
                                                        *
                                                    </span>
                                                </Label>
                                                <Input
                                                    id="assetId"
                                                    placeholder="Enter Asset ID"
                                                    value={formData.assetId}
                                                    onChange={(e) =>
                                                        handleChange(
                                                            "assetId",
                                                            e.target.value
                                                        )
                                                    }
                                                    className="rounded-lg border-neutral-200 dark:border-neutral-800 bg-white dark:bg-card h-10 px-3.5 focus-visible:ring-1 focus-visible:ring-blue-500 transition-colors"
                                                />
                                            </div>

                                            <div>
                                                <Label
                                                    htmlFor="serial"
                                                    className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5 ms-1 flex items-center gap-0.5"
                                                >
                                                    Serial Number{" "}
                                                    <span className="text-red-500">
                                                        *
                                                    </span>
                                                </Label>
                                                <Input
                                                    id="serial"
                                                    placeholder="Enter Serial Number"
                                                    value={formData.serial}
                                                    onChange={(e) =>
                                                        handleChange(
                                                            "serial",
                                                            e.target.value
                                                        )
                                                    }
                                                    className="rounded-lg border-neutral-200 dark:border-neutral-800 bg-white dark:bg-card h-10 px-3.5 focus-visible:ring-1 focus-visible:ring-blue-500 transition-colors"
                                                />
                                            </div>

                                            <div>
                                                <Label
                                                    htmlFor="assetType"
                                                    className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5 ms-1 flex items-center gap-0.5"
                                                >
                                                    Asset Type{" "}
                                                    <span className="text-red-500">
                                                        *
                                                    </span>
                                                </Label>
                                                <Select
                                                    value={formData.assetType}
                                                    onValueChange={(val) =>
                                                        setFormData((prev) => ({
                                                            ...prev,
                                                            assetType: val,
                                                        }))
                                                    }
                                                >
                                                    <SelectTrigger
                                                        id="assetType"
                                                        name="assetType"
                                                        className="w-full rounded-lg border-neutral-200 dark:border-neutral-800 bg-white dark:bg-card h-10 px-3.5 text-sm"
                                                    >
                                                        <SelectValue placeholder="Select Asset Type" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="it">
                                                            IT
                                                        </SelectItem>
                                                        <SelectItem value="admin">
                                                            Admin
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div>
                                                <Label
                                                    htmlFor="type"
                                                    className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5 ms-1 flex items-center gap-0.5"
                                                >
                                                    Category{" "}
                                                    <span className="text-red-500">
                                                        *
                                                    </span>
                                                </Label>
                                                <CustomComboBox
                                                    options={products.types}
                                                    placeholder="Select Category"
                                                    onSelect={(value) => {
                                                        handleChange(
                                                            "type",
                                                            value
                                                        );
                                                    }}
                                                    className="w-full"
                                                />
                                            </div>

                                            <div>
                                                <Label
                                                    htmlFor="modelNo"
                                                    className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5 ms-1 flex items-center gap-0.5"
                                                >
                                                    Model No{" "}
                                                    <span className="text-red-500">
                                                        *
                                                    </span>
                                                </Label>
                                                <CustomComboBox
                                                    options={products.models}
                                                    placeholder="Select Model Number"
                                                    onSelect={(value) => {
                                                        handleChange(
                                                            "modelNo",
                                                            value
                                                        );
                                                    }}
                                                    className="w-full"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 2: Financial & Location */}
                                    <div className="space-y-4 pt-2">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            <div>
                                                <Label
                                                    htmlFor="glAccount"
                                                    className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5 ms-1"
                                                >
                                                    GL Account
                                                </Label>
                                                <Input
                                                    id="glAccount"
                                                    placeholder="Enter GL Account"
                                                    value={formData.glAccount}
                                                    onChange={(e) =>
                                                        handleChange(
                                                            "glAccount",
                                                            e.target.value
                                                        )
                                                    }
                                                    className="rounded-lg border-neutral-200 dark:border-neutral-800 bg-white dark:bg-card h-10 px-3.5 focus-visible:ring-1 focus-visible:ring-blue-500 transition-colors"
                                                />
                                            </div>

                                            <div>
                                                <Label
                                                    htmlFor="assetCode"
                                                    className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5 ms-1"
                                                >
                                                    US Unique Asset Code
                                                </Label>
                                                <Input
                                                    id="assetCode"
                                                    placeholder="Enter Unique Code"
                                                    value={formData.assetCode}
                                                    onChange={(e) =>
                                                        handleChange(
                                                            "assetCode",
                                                            e.target.value
                                                        )
                                                    }
                                                    className="rounded-lg border-neutral-200 dark:border-neutral-800 bg-white dark:bg-card h-10 px-3.5 focus-visible:ring-1 focus-visible:ring-blue-500 transition-colors"
                                                />
                                            </div>

                                            <div>
                                                <Label
                                                    htmlFor="location"
                                                    className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5 ms-1"
                                                >
                                                    Location
                                                </Label>
                                                <Input
                                                    id="location"
                                                    placeholder="Enter Location"
                                                    value={formData.location}
                                                    onChange={(e) =>
                                                        handleChange(
                                                            "location",
                                                            e.target.value
                                                        )
                                                    }
                                                    className="rounded-lg border-neutral-200 dark:border-neutral-800 bg-white dark:bg-card h-10 px-3.5 focus-visible:ring-1 focus-visible:ring-blue-500 transition-colors"
                                                />
                                            </div>

                                            <div className="lg:col-span-2">
                                                <Label
                                                    htmlFor="supplierName"
                                                    className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5 ms-1"
                                                >
                                                    Supplier Name
                                                </Label>
                                                <Input
                                                    id="supplierName"
                                                    placeholder="Enter Supplier Name"
                                                    value={
                                                        formData.supplierName
                                                    }
                                                    onChange={(e) =>
                                                        handleChange(
                                                            "supplierName",
                                                            e.target.value
                                                        )
                                                    }
                                                    className="rounded-lg border-neutral-200 dark:border-neutral-800 bg-white dark:bg-card h-10 px-3.5 focus-visible:ring-1 focus-visible:ring-blue-500 transition-colors"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 3: Life Cycle & Criticality */}
                                    <div className="space-y-4 pt-2">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            <div className="flex flex-col gap-1">
                                                <Label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5 ms-1">
                                                    Expiry Date
                                                </Label>
                                                <Button
                                                    variant="outline"
                                                    className="justify-start text-left font-normal w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-card h-10 px-3.5 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
                                                    onClick={() =>
                                                        setIsOpen((prev) => ({
                                                            ...prev,
                                                            expDate: true,
                                                        }))
                                                    }
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4 text-neutral-400" />
                                                    {expDate ? (
                                                        formatDate(expDate)
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
                                                    className="justify-start text-left font-normal w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-card h-10 px-3.5 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
                                                    onClick={() =>
                                                        setIsOpen((prev) => ({
                                                            ...prev,
                                                            pisDate: true,
                                                        }))
                                                    }
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4 text-neutral-400" />
                                                    {pisDate ? (
                                                        formatDate(pisDate)
                                                    ) : (
                                                        <span className="text-neutral-400">
                                                            Select date
                                                        </span>
                                                    )}
                                                </Button>
                                            </div>

                                            <div>
                                                <Label
                                                    htmlFor="assetCriticality"
                                                    className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5 ms-1"
                                                >
                                                    Asset Criticality
                                                </Label>
                                                <Input
                                                    id="assetCriticality"
                                                    placeholder="Asset Criticality Details"
                                                    value={
                                                        formData.assetCriticality
                                                    }
                                                    onChange={(e) =>
                                                        handleChange(
                                                            "assetCriticality",
                                                            e.target.value
                                                        )
                                                    }
                                                    className="rounded-lg border-neutral-200 dark:border-neutral-800 bg-white dark:bg-card h-10 px-3.5 focus-visible:ring-1 focus-visible:ring-blue-500 transition-colors"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 4: Child Configuration */}
                                    <div className="pt-2">
                                        <div className="bg-neutral-50/50 dark:bg-neutral-900/10 p-4 sm:p-5 rounded-2xl border border-neutral-100 dark:border-neutral-850">
                                            <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-3 ms-1">
                                                Child Assets Configuration
                                            </p>
                                            <div className="flex flex-col gap-4">
                                                <div>
                                                    <p className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                        Does this asset contain
                                                        child assets?
                                                    </p>
                                                    <RadioGroup
                                                        className="flex gap-6 ms-1"
                                                        value={
                                                            formData.child_asset ==
                                                            1
                                                                ? "yes"
                                                                : "no"
                                                        }
                                                        onValueChange={(
                                                            val
                                                        ) => {
                                                            setFormData(
                                                                (prev) => ({
                                                                    ...prev,
                                                                    child_asset:
                                                                        val ==
                                                                        "yes"
                                                                            ? 1
                                                                            : 0,
                                                                })
                                                            );
                                                            if (val == "no") {
                                                                setSelectedChildAssets(
                                                                    []
                                                                );
                                                            }
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <RadioGroupItem
                                                                value="yes"
                                                                id="yes"
                                                            />
                                                            <Label
                                                                htmlFor="yes"
                                                                className="font-normal text-sm cursor-pointer text-neutral-700 dark:text-neutral-300"
                                                            >
                                                                Yes
                                                            </Label>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <RadioGroupItem
                                                                value="no"
                                                                id="no"
                                                            />
                                                            <Label
                                                                htmlFor="no"
                                                                className="font-normal text-sm cursor-pointer text-neutral-700 dark:text-neutral-300"
                                                            >
                                                                No
                                                            </Label>
                                                        </div>
                                                    </RadioGroup>
                                                </div>

                                                {formData.child_asset == 1 && (
                                                    <div className="space-y-3 pt-2">
                                                        <Label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1 ms-1">
                                                            Child Assets List
                                                        </Label>
                                                        {selectedChildAssets.map(
                                                            (
                                                                childAsset,
                                                                index
                                                            ) => (
                                                                <div
                                                                    key={index}
                                                                    className="flex items-center gap-3 bg-white dark:bg-card p-2 rounded-xl border border-neutral-150 dark:border-neutral-800"
                                                                >
                                                                    <div className="flex-1 w-full">
                                                                        <Combobox
                                                                            items={allAssets.map(
                                                                                (
                                                                                    a
                                                                                ) => ({
                                                                                    label: a.asset_id,
                                                                                    value: String(
                                                                                        a.id
                                                                                    ),
                                                                                })
                                                                            )}
                                                                            hint="Select Child Asset"
                                                                            value={String(
                                                                                childAsset.value ||
                                                                                    ""
                                                                            )}
                                                                            onChange={(
                                                                                val
                                                                            ) => {
                                                                                const newChildAssets =
                                                                                    [
                                                                                        ...selectedChildAssets,
                                                                                    ];
                                                                                newChildAssets[
                                                                                    index
                                                                                ] =
                                                                                    {
                                                                                        ...newChildAssets[
                                                                                            index
                                                                                        ],
                                                                                        value: val,
                                                                                    };
                                                                                setSelectedChildAssets(
                                                                                    newChildAssets
                                                                                );
                                                                            }}
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
                                                                    setSelectedChildAssets(
                                                                        [
                                                                            ...selectedChildAssets,
                                                                            {
                                                                                id: Date.now(),
                                                                                value: "",
                                                                            },
                                                                        ]
                                                                    )
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

                                    <div>
                                        <Label
                                            htmlFor="remarks"
                                            className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5 ms-1"
                                        >
                                            Remarks
                                        </Label>
                                        <Textarea
                                            id="remarks"
                                            className="resize-none rounded-lg border-neutral-200 dark:border-neutral-800 bg-white dark:bg-card px-3.5 py-2 focus-visible:ring-1 focus-visible:ring-blue-500 transition-colors min-h-[80px]"
                                            placeholder="Enter any additional remarks"
                                            value={formData.remarks}
                                            onChange={(e) =>
                                                handleChange(
                                                    "remarks",
                                                    e.target.value
                                                )
                                            }
                                        />
                                    </div>

                                    <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800/80">
                                        <Button
                                            className="w-full cursor-pointer rounded-lg bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:text-neutral-900 dark:hover:bg-blue-400 border-0 shadow-sm transition-all duration-150 py-2.5 h-11 font-medium text-base"
                                            disabled={loading}
                                            onClick={handleSubmit}
                                        >
                                            {loading
                                                ? "Adding Asset..."
                                                : "Add Asset"}
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                            <Dialog
                                open={isOpen.expDate}
                                onOpenChange={(e) =>
                                    setIsOpen((prev) => ({
                                        ...prev,
                                        expDate: e,
                                    }))
                                }
                            >
                                <DialogContent
                                    onPointerDownOutside={() =>
                                        setIsOpen((prev) => ({
                                            ...prev,
                                            expDate: false,
                                        }))
                                    }
                                    unbounded={true}
                                    className="w-[300px]"
                                >
                                    <DialogTitle className="hidden" />
                                    <DialogDescription className="hidden" />
                                    <Calendar
                                        mode="single"
                                        selected={expDate}
                                        onSelect={(e) => {
                                            if (e) {
                                                setExpDate(e);
                                                setIsOpen((prev) => ({
                                                    ...prev,
                                                    expDate: false,
                                                }));
                                            }
                                        }}
                                        startMonth={minExpDate}
                                        endMonth={maxExpDate}
                                        disabled={[
                                            { before: minExpDate },
                                            { after: maxExpDate },
                                        ]}
                                        captionLayout="dropdown"
                                        className="w-[250px]"
                                    />
                                </DialogContent>
                            </Dialog>
                            <Dialog
                                open={isOpen.pisDate}
                                onOpenChange={(e) =>
                                    setIsOpen((prev) => ({
                                        ...prev,
                                        pisDate: e,
                                    }))
                                }
                            >
                                <DialogContent
                                    onPointerDownOutside={() =>
                                        setIsOpen((prev) => ({
                                            ...prev,
                                            pisDate: false,
                                        }))
                                    }
                                    unbounded={true}
                                    className="w-[300px]"
                                >
                                    <DialogTitle className="hidden" />
                                    <DialogDescription className="hidden" />
                                    <Calendar
                                        mode="single"
                                        selected={pisDate}
                                        onSelect={(e) => {
                                            if (e) {
                                                setpisDate(e);
                                                setIsOpen((prev) => ({
                                                    ...prev,
                                                    pisDate: false,
                                                }));
                                            }
                                        }}
                                        startMonth={new Date(2020, 0)}
                                        toYear={2100}
                                        captionLayout="dropdown"
                                        className="w-[250px]"
                                    />
                                </DialogContent>
                            </Dialog>
                        </TabsContent>
                    )}
                    {activeTab === "Bulk" && (
                        <TabsContent
                            key="Bulk"
                            value="Bulk"
                            forceMount
                            className="flex flex-col w-full h-full gap-4"
                            style={{ display: "flex" }}
                        >
                            <motion.div
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -20, opacity: 0 }}
                                transition={{
                                    duration: 0.2,
                                    ease: "easeInOut",
                                }}
                                className="w-full"
                            >
                                <div className="w-full max-w-4xl mt-1 mx-auto p-6 sm:p-8 bg-white dark:bg-card rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 shadow-md shadow-slate-100/40 dark:shadow-none space-y-6 mb-6">
                                    <div className="space-y-4">
                                        {/* Drag & Drop Zone */}
                                        <div
                                            onDragOver={(e) => {
                                                e.preventDefault();
                                                setIsDragging(true);
                                            }}
                                            onDragLeave={() =>
                                                setIsDragging(false)
                                            }
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                setIsDragging(false);
                                                const file =
                                                    e.dataTransfer.files[0];
                                                if (file) {
                                                    processCsvFile(file);
                                                }
                                            }}
                                            className={cn(
                                                "border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer min-h-[200px]",
                                                isDragging
                                                    ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
                                                    : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-neutral-50/30 dark:bg-neutral-900/10"
                                            )}
                                            onClick={() =>
                                                document
                                                    .getElementById("csvFile")
                                                    ?.click()
                                            }
                                        >
                                            <input
                                                id="csvFile"
                                                type="file"
                                                accept=".csv"
                                                onChange={handleCsvFileChange}
                                                className="hidden"
                                            />

                                            <div className="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-full text-neutral-600 dark:text-neutral-400 mb-4">
                                                <UploadCloud className="h-8 w-8 text-neutral-500 dark:text-neutral-400" />
                                            </div>

                                            {csvFile ? (
                                                <div className="text-center space-y-1.5">
                                                    <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 flex items-center justify-center gap-1.5">
                                                        <FileText className="h-4 w-4 text-blue-500" />{" "}
                                                        {csvFile.name}
                                                    </p>
                                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                                        {(
                                                            csvFile.size / 1024
                                                        ).toFixed(1)}{" "}
                                                        KB • Ready to validate
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="text-center space-y-1">
                                                    <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                                                        Click to upload or drag
                                                        & drop CSV file
                                                    </p>
                                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                                        Excel/CSV standard
                                                        format supported
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Requirements & Download Info */}
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/30 border border-neutral-200/50 dark:border-neutral-800/50 gap-4">
                                            <div className="space-y-1">
                                                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                                                    Requirements
                                                </p>
                                                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-xl">
                                                    CSV must include:{" "}
                                                    <code className="px-1 py-0.5 rounded bg-neutral-250 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-205 font-mono">
                                                        asset_id
                                                    </code>
                                                    ,{" "}
                                                    <code className="px-1 py-0.5 rounded bg-neutral-250 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-205 font-mono">
                                                        serial
                                                    </code>
                                                    ,{" "}
                                                    <code className="px-1 py-0.5 rounded bg-neutral-250 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-205 font-mono">
                                                        type
                                                    </code>
                                                    , and{" "}
                                                    <code className="px-1 py-0.5 rounded bg-neutral-250 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-205 font-mono">
                                                        model_no
                                                    </code>{" "}
                                                    columns.
                                                </p>
                                            </div>
                                            <Button
                                                variant="outline"
                                                type="button"
                                                onClick={handleSampleCsv}
                                                className="cursor-pointer text-xs font-semibold flex items-center gap-1.5 h-9 rounded-lg border-neutral-250 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
                                            >
                                                <Download className="h-3.5 w-3.5" />{" "}
                                                Download Sample CSV
                                            </Button>
                                        </div>

                                        {csvErrors.length > 0 &&
                                            csvErrors?.some(
                                                (error) =>
                                                    error.type ===
                                                    "missing required headers"
                                            ) && (
                                                <div className="mt-2 p-4 border border-red-200 dark:border-red-900/30 rounded-xl bg-red-50/50 dark:bg-red-950/20 flex gap-3">
                                                    <AlertCircle className="h-5 w-5 text-red-650 shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="text-sm text-red-800 dark:text-red-300 font-medium">
                                                            Invalid CSV Format
                                                        </p>
                                                        <p className="text-xs text-red-655 dark:text-red-405 mt-1 leading-relaxed">
                                                            {
                                                                csvErrors.find(
                                                                    (error) =>
                                                                        error.type ===
                                                                        "missing required headers"
                                                                )?.message
                                                            }
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                    </div>

                                    {csvData.length > 0 && (
                                        <div className="space-y-3 pt-2">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                                                    Data Preview (First 3 rows)
                                                </h3>
                                                <span className="text-xs bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 px-2.5 py-0.5 rounded-full font-medium">
                                                    {csvData.length} records
                                                    ready
                                                </span>
                                            </div>
                                            <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-card">
                                                <Table className="w-full text-xs sm:text-sm min-w-[900px]">
                                                    <TableHeader className="bg-neutral-50/50 dark:bg-neutral-900/50 border-b border-neutral-200 dark:border-neutral-800">
                                                        <TableRow>
                                                            <TableHead className="h-10 px-4 font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider text-[10px]">
                                                                Asset ID
                                                            </TableHead>
                                                            <TableHead className="h-10 px-4 font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider text-[10px]">
                                                                Serial
                                                            </TableHead>
                                                            <TableHead className="h-10 px-4 font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider text-[10px]">
                                                                Category
                                                            </TableHead>
                                                            <TableHead className="h-10 px-4 font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider text-[10px]">
                                                                Model No
                                                            </TableHead>
                                                            <TableHead className="h-10 px-4 font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider text-[10px]">
                                                                Status
                                                            </TableHead>
                                                            <TableHead className="h-10 px-4 font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider text-[10px]">
                                                                Location
                                                            </TableHead>
                                                            <TableHead className="h-10 px-4 font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider text-[10px]">
                                                                Exp Date
                                                            </TableHead>
                                                            <TableHead className="h-10 px-4 font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider text-[10px]">
                                                                PIS Date
                                                            </TableHead>
                                                            <TableHead className="h-10 px-4 font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider text-[10px]">
                                                                GL Account
                                                            </TableHead>
                                                            <TableHead className="h-10 px-4 font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider text-[10px]">
                                                                US Asset Code
                                                            </TableHead>
                                                            <TableHead className="h-10 px-4 font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider text-[10px]">
                                                                Supplier
                                                            </TableHead>
                                                            <TableHead className="h-10 px-4 font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider text-[10px]">
                                                                Criticality
                                                            </TableHead>
                                                            <TableHead className="h-10 px-4 font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider text-[10px]">
                                                                Type
                                                            </TableHead>
                                                            <TableHead className="h-10 px-4 font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider text-[10px]">
                                                                Child Assets
                                                            </TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {csvData
                                                            .slice(0, 3)
                                                            .map(
                                                                (
                                                                    row,
                                                                    index
                                                                ) => (
                                                                    <TableRow
                                                                        key={
                                                                            index
                                                                        }
                                                                        className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30 transition-colors"
                                                                    >
                                                                        <TableCell className="px-4 py-3 font-semibold text-neutral-900 dark:text-neutral-100">
                                                                            {
                                                                                row.asset_id
                                                                            }
                                                                        </TableCell>
                                                                        <TableCell className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                                                                            {
                                                                                row.serial
                                                                            }
                                                                        </TableCell>
                                                                        <TableCell className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                                                                            {
                                                                                row.category
                                                                            }
                                                                        </TableCell>
                                                                        <TableCell className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                                                                            {
                                                                                row.model_no
                                                                            }
                                                                        </TableCell>
                                                                        <TableCell className="px-4 py-3">
                                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                                                                                {row.status ||
                                                                                    "N/A"}
                                                                            </span>
                                                                        </TableCell>
                                                                        <TableCell className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                                                                            {
                                                                                row.location
                                                                            }
                                                                        </TableCell>
                                                                        <TableCell className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                                                                            {
                                                                                row.exp_date
                                                                            }
                                                                        </TableCell>
                                                                        <TableCell className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                                                                            {
                                                                                row.pis_date
                                                                            }
                                                                        </TableCell>
                                                                        <TableCell className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                                                                            {
                                                                                row.gl_account
                                                                            }
                                                                        </TableCell>
                                                                        <TableCell className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                                                                            {
                                                                                row.us_asset_code
                                                                            }
                                                                        </TableCell>
                                                                        <TableCell className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                                                                            {
                                                                                row.supplier_name
                                                                            }
                                                                        </TableCell>
                                                                        <TableCell className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                                                                            {
                                                                                row.asset_criticality
                                                                            }
                                                                        </TableCell>
                                                                        <TableCell className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                                                                            {
                                                                                row.type
                                                                            }
                                                                        </TableCell>
                                                                        <TableCell className="px-4 py-3 text-neutral-600 dark:text-neutral-300 truncate max-w-[150px]">
                                                                            {
                                                                                row.child_assets
                                                                            }
                                                                        </TableCell>
                                                                    </TableRow>
                                                                )
                                                            )}
                                                    </TableBody>
                                                </Table>
                                                {csvData.length > 3 && (
                                                    <div className="p-3 bg-neutral-50/50 dark:bg-neutral-900/30 text-center border-t border-neutral-100 dark:border-neutral-800">
                                                        <p className="text-xs text-neutral-500 dark:text-neutral-450">
                                                            Showing first 3 rows
                                                            of {csvData.length}{" "}
                                                            total entries.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                            <Dialog
                                open={booleanStates.resultsDialog}
                                onOpenChange={(open) =>
                                    setBooleanStates((prev) => ({
                                        ...prev,
                                        resultsDialog: open,
                                    }))
                                }
                            >
                                <DialogContent className="max-w-md">
                                    <DialogHeader>
                                        <DialogTitle className="text-green-600">
                                            Upload Results
                                        </DialogTitle>
                                    </DialogHeader>
                                    {uploadResults && (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="p-3 bg-blue-50 rounded-md border-blue-600 border">
                                                    <p className="text-sm text-blue-600 font-medium">
                                                        Total Rows
                                                    </p>
                                                    <p className="text-2xl font-bold text-blue-800">
                                                        {
                                                            uploadResults.totalRows
                                                        }
                                                    </p>
                                                </div>
                                                <div className="p-3 bg-green-50 rounded-md border border-green-600">
                                                    <p className="text-sm text-green-600 font-medium">
                                                        Uploaded
                                                    </p>
                                                    <p className="text-2xl font-bold text-green-800">
                                                        {
                                                            uploadResults.uploadedCount
                                                        }
                                                    </p>
                                                </div>
                                                <div className="p-3 bg-yellow-50 rounded-md border border-yellow-600">
                                                    <p className="text-sm text-yellow-600 font-medium">
                                                        Duplicates
                                                    </p>
                                                    <p className="text-2xl font-bold text-yellow-800">
                                                        {
                                                            uploadResults.duplicateCount
                                                        }
                                                    </p>
                                                </div>
                                                <div className="p-3 bg-red-50 rounded-md border border-red-600">
                                                    <p className="text-sm text-red-600 font-medium">
                                                        Failed
                                                    </p>
                                                    <p className="text-2xl font-bold text-red-800">
                                                        {
                                                            uploadResults.validationFailureCount
                                                        }
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="space-y-2 flex justify-around">
                                                <div className="flex text-sm w-1/3 gap-2 justify-center">
                                                    <span>Success Rate:</span>
                                                    <span className="font-medium">
                                                        {uploadResults.totalRows >
                                                        0
                                                            ? Math.round(
                                                                  (uploadResults.uploadedCount /
                                                                      uploadResults.totalRows) *
                                                                      100
                                                              )
                                                            : 0}
                                                        %
                                                    </span>
                                                </div>
                                                <div className="flex text-sm w-1/3 gap-2 justify-center">
                                                    <span>Duplicate Rate:</span>
                                                    <span className="font-medium">
                                                        {uploadResults.totalRows >
                                                        0
                                                            ? Math.round(
                                                                  (uploadResults.duplicateCount /
                                                                      uploadResults.totalRows) *
                                                                      100
                                                              )
                                                            : 0}
                                                        %
                                                    </span>
                                                </div>
                                                <div className="flex text-sm w-1/3 gap-2 justify-center">
                                                    <span>Failure Rate:</span>
                                                    <span className="font-medium">
                                                        {uploadResults.totalRows >
                                                        0
                                                            ? Math.round(
                                                                  (uploadResults.validationFailureCount /
                                                                      uploadResults.totalRows) *
                                                                      100
                                                              )
                                                            : 0}
                                                        %
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="h-48 rounded-md border p-3 overflow-y-auto">
                                                {uploadResults.duplicates &&
                                                    uploadResults.duplicates
                                                        .length > 0 && (
                                                        <>
                                                            <p className="text-sm text-gray-500">
                                                                Duplicates row
                                                                details in the
                                                                uploaded file.
                                                            </p>
                                                            <Table className="mt-2 w-full">
                                                                <TableHeader className="text-sm font-medium text-gray-700">
                                                                    <TableRow className="w-full">
                                                                        <TableHead className="">
                                                                            Row
                                                                        </TableHead>
                                                                        <TableHead>
                                                                            Error
                                                                        </TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {uploadResults.duplicates.map(
                                                                        (
                                                                            duplicate,
                                                                            index
                                                                        ) => (
                                                                            <TableRow
                                                                                key={
                                                                                    index
                                                                                }
                                                                                className="w-full"
                                                                            >
                                                                                <TableCell className="px-4 py-2 w-10">
                                                                                    {duplicate.row ||
                                                                                        "N/A"}
                                                                                </TableCell>
                                                                                <TableCell className="px-4 py-2">
                                                                                    {duplicate.error ||
                                                                                        "Unknown error"}
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        )
                                                                    )}
                                                                </TableBody>
                                                            </Table>
                                                        </>
                                                    )}
                                                {uploadResults.failed &&
                                                    uploadResults.failed
                                                        .length > 0 && (
                                                        <>
                                                            <p
                                                                className={cn(
                                                                    "text-sm text-gray-500",
                                                                    uploadResults
                                                                        .duplicates
                                                                        .length >
                                                                        0
                                                                        ? "mt-6"
                                                                        : ""
                                                                )}
                                                            >
                                                                Error row
                                                                details in the
                                                                uploaded file.
                                                            </p>
                                                            <Table className="mt-2 w-full">
                                                                <TableHeader className="text-sm font-medium text-gray-700">
                                                                    <TableRow className="w-full">
                                                                        <TableHead className="">
                                                                            Row
                                                                        </TableHead>
                                                                        <TableHead>
                                                                            Error
                                                                        </TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {uploadResults.failed.map(
                                                                        (
                                                                            fail,
                                                                            index
                                                                        ) => (
                                                                            <TableRow
                                                                                key={
                                                                                    index
                                                                                }
                                                                                className="w-full"
                                                                            >
                                                                                <TableCell className="px-4 py-2 w-10">
                                                                                    {fail.row ||
                                                                                        "N/A"}
                                                                                </TableCell>
                                                                                <TableCell className="px-4 py-2">
                                                                                    {fail.error ||
                                                                                        "Unknown error"}
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        )
                                                                    )}
                                                                </TableBody>
                                                            </Table>
                                                        </>
                                                    )}
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex justify-end pt-4">
                                        <Button
                                            variant="ghost"
                                            onClick={() =>
                                                setBooleanStates((prev) => ({
                                                    ...prev,
                                                    resultsDialog: false,
                                                }))
                                            }
                                            className="px-6 cursor-pointer"
                                        >
                                            Close
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                            <Dialog
                                open={booleanStates.errorDialog}
                                onOpenChange={(open) => {
                                    setBooleanStates((prev) => ({
                                        ...prev,
                                        errorDialog: open,
                                    }));
                                }}
                            >
                                <DialogTrigger asChild>
                                    <div className="w-full flex justify-center pt-4">
                                        <SpinnerButton
                                            onClick={handleCSVSubmit}
                                            className="w-full max-w-md cursor-pointer rounded-lg bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:text-neutral-900 dark:hover:bg-blue-400 border-0 shadow-sm transition-all duration-150 py-2.5 h-11 font-medium text-base disabled:opacity-50 disabled:cursor-not-allowed"
                                            loading={booleanStates.isUploading}
                                            loadingText="Uploading..."
                                            disabled={
                                                booleanStates.isUploading ||
                                                !csvFile
                                            }
                                        >
                                            Upload {csvData.length} Assets
                                        </SpinnerButton>
                                    </div>
                                </DialogTrigger>
                                <DialogContent
                                    className="max-w-2xl max-h-[85vh]"
                                    onPointerDownOutside={(e) =>
                                        e.preventDefault()
                                    }
                                >
                                    <DialogHeader>
                                        <DialogTitle className="text-red-600">
                                            Validation Errors (
                                            {csvErrors.length})
                                        </DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-3 max-h-[65vh] overflow-y-auto">
                                        {csvErrors.map((error, index) => (
                                            <div
                                                key={index}
                                                className="p-4 border rounded-lg bg-red-50"
                                            >
                                                <p className="text-sm font-medium text-red-800">
                                                    {error.line
                                                        ? `Line ${error.line}: `
                                                        : ""}
                                                    {error.type}
                                                </p>
                                                {error.message && (
                                                    <p className="text-xs text-red-600 mt-2">
                                                        {error.message}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-end gap-3 pt-4">
                                        <Button
                                            variant="ghost"
                                            className="cursor-pointer"
                                            onClick={() =>
                                                setBooleanStates((prev) => ({
                                                    ...prev,
                                                    errorDialog: false,
                                                }))
                                            }
                                            disabled={booleanStates.isUploading}
                                        >
                                            Cancel
                                        </Button>
                                        <SpinnerButton
                                            variant="ghost"
                                            className="cursor-pointer"
                                            onClick={sendCsvFile}
                                            loading={booleanStates.isUploading}
                                            loadingText="Uploading..."
                                            disabled={booleanStates.isUploading}
                                        >
                                            OK
                                        </SpinnerButton>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </TabsContent>
                    )}
                </AnimatePresence>
            </Tabs>
        </div>
    );
}
