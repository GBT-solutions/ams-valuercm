import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "./index.css";
import Router from "@/utils/Router.jsx";
import ContextProvider from "@/utils/Context.jsx";

createRoot(document.getElementById("root")).render(
    // <StrictMode>
    <ContextProvider>
        <BrowserRouter>
            <Router />
        </BrowserRouter>
    </ContextProvider>
    //  </StrictMode>
);
