import { cn } from "@/lib/utils";

const Spinner = ({ color = "blue", size = 32, thickness = 4 }) => {
    const colorMap = {
        blue: "border-b-blue-500 border-l-blue-500 border-r-blue-500",
        red: "border-b-red-500 border-l-red-500 border-r-red-500",
        green: "border-b-green-500 border-l-green-500 border-r-green-500",
        gray: "border-b-gray-500 border-l-gray-500 border-r-gray-500",
    };

    const selectedColor = colorMap[color] || colorMap.blue;

    return (
        <div className="flex justify-center items-center">
            <div
                style={{
                    width: size,
                    height: size,
                    borderWidth: thickness,
                }}
                className={cn(
                    "rounded-full animate-spin border-solid",
                    "border-gray-200",
                    selectedColor,
                    "border-t-transparent"
                )}
            />
        </div>
    );
};

export default Spinner;
