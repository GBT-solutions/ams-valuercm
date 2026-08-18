// ResetPassword.jsx
import { useEffect, useState } from "react";
import { Lock, ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router";
import SpinnerButton from "../components/ui/spinner-button";
import { Toaster } from "react-hot-toast";
import apiService from "../utils/apiService";
import toaster from "../utils/toaster";
// using lucide-react icons for consistency

function ResetPassword() {
    const { token } = useParams();
    const navigate = useNavigate();
    const [inputs, setInputs] = useState({
        newPassword: "",
        confirmPassword: "",
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setInputs({ ...inputs, [e.target.id]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (inputs.newPassword != inputs.confirmPassword) {
            toaster("error", "Passwords not matched!");
            return;
        }
        setLoading(true);
        try {
            const response = await apiService.post("/users/reset-password", {
                token,
                password: inputs.newPassword,
            });
            if (response.success) {
                navigate("/");
            }
            toaster("success", "Password changed successfully");
        } catch (error) {
            const errMsg = error?.response?.data?.message || error.message;
            toaster("error", errMsg);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        const t = localStorage.getItem("token");
        const u = localStorage.getItem("user");
        if (t && u) {
            navigate("/");
        }
    }, []);

    return (
        <div className="relative w-full h-screen bg-[#fcfcfc] flex items-center justify-center">
            <img
                src="/reset_asset_1.svg"
                className="absolute bottom-0 left-0 w-1/2 pointer-events-none"
            />
            <img
                src="/reset_asset_2.svg"
                className="absolute top-0 right-0 w-1/2 pointer-events-none"
            />
            <div className="w-[75%] flex">
                <div className="w-1/2 p-4">
                    <img src="/reset_pass.jpg" className="w" alt="" />
                </div>
                <div className="w-1/2 ps-2 flex flex-col items-center justify-center">
                    <h2 className="text-[42px] font-bold mb-10">
                        Reset <br /> Your Password
                    </h2>
                    <div className="relative group">
                        <div className="absolute top-[14px] left-[calc(50%-180px)] z-10 flex items-center pointer-events-none">
                            <Lock className="h-5 w-5 text-blue-300 group-focus-within:text-blue-600 transition-colors" />
                        </div>

                        <input
                            type="password"
                            id="newPassword"
                            value={inputs.newPassword}
                            onChange={handleChange}
                            placeholder="Enter your Password"
                            className="w-[400px] pl-14 pr-4 py-3 rounded-full bg-white text-gray-800 placeholder-blue-300/70 font-medium shadow-sm transition-all ring-1 ring-blue-400/30 focus:ring-blue-600 focus:outline-blue-500"
                        />
                    </div>
                    <div className="relative mt-4 group">
                        <div className="absolute top-[14px] left-[calc(50%-180px)] z-10 flex items-center pointer-events-none">
                            <Lock className="h-5 w-5 text-blue-300 group-focus-within:text-blue-600 transition-colors" />
                        </div>
                        <input
                            type="password"
                            id="confirmPassword"
                            value={inputs.confirmPassword}
                            onChange={handleChange}
                            placeholder="Re-enter your Password"
                            className="w-[400px] pl-14 pr-4 py-3 rounded-full bg-white text-gray-800 placeholder-blue-300/70 font-medium shadow-sm transition-all ring-1 ring-blue-400/30 focus:ring-blue-600 focus:outline-blue-500"
                        />
                    </div>
                    <div className="flex items-center justify-center gap-4 mt-8">
                        <SpinnerButton
                            type="button"
                            onClick={handleSubmit}
                            loading={loading}
                            disabled={loading}
                            loadingText="Changing..."
                            className="cursor-pointer bg-gradient-to-r from-[#fac401] to-[#ff9504] hover:bg-[#e68a30] text-black font-bold py-4 px-8 rounded-full transition-all duration-300 shadow-[0_10px_20px_-10px_rgba(255,159,67,0.5)] hover:shadow-[0_15px_30px_-10px_rgba(255,159,67,0.6)] hover:-translate-y-0.5 text-center text-sm md:text-base"
                        >
                            Change Password
                        </SpinnerButton>
                    </div>
                    <div className="mt-10">
                        <button
                            onClick={() => {
                                navigate("/");
                            }}
                            className="mt-4 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-500 transition-colors cursor-pointer"
                        >
                            <ArrowLeft size={16} /> Back to Sign In
                        </button>
                    </div>
                </div>
            </div>
            <Toaster position="top-right" />
        </div>
    );
}

export default ResetPassword;
