import { createContext, useState } from "react";

const Context = createContext();

const ContextProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [products, setProducts] = useState({ types: [], models: [] });
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [lastBackup, setLastBackup] = useState(null);

    return (
        <Context.Provider
            value={{
                user,
                setUser,
                employees,
                setEmployees,
                products,
                setProducts,
                isSidebarOpen,
                setIsSidebarOpen,
                lastBackup,
                setLastBackup,
            }}
        >
            {children}
        </Context.Provider>
    );
};

export default ContextProvider;

export { Context };
