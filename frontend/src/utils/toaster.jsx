import { toast } from "react-hot-toast";
export default function (type, message) {
    if (type === "success") {
        return toast.success(message, {
            style: {
                padding: "16px",
                background: "oklch(52.7% 0.154 150.069)", // green-700
                color: "#fff",
            },
            iconTheme: {
                primary: "white",
                secondary: "oklch(52.7% 0.154 150.069)",
            },
        });
    } else if (type === "error") {
        toast.error(message, {
            style: {
                padding: "16px",
                background: "oklch(50.5% 0.213 27.518)", // red-700
                color: "#fff",
            },
            iconTheme: {
                primary: "white",
                secondary: "oklch(50.5% 0.213 27.518)",
            },
        });
    }
}
