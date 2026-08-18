let navigateFn;
let setUserFn;

export const setNavigate = (navigate) => {
    navigateFn = navigate;
};
export const setUserContext = (setUser) => {
    setUserFn = setUser;
};

export const navigateTo = (...args) => {
    if (navigateFn && typeof navigateFn === "function") {
        navigateFn(...args);
    } else {
        console.error("Navigate function not initialized");
    }
};

export const navigateToLogin = () => {
    if (
        navigateFn &&
        setUserFn &&
        typeof navigateFn === "function" &&
        typeof setUserFn === "function"
    ) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUserFn && setUserFn(null);
        navigateFn("/");
    } else {
        console.error("Navigate function not initialized");
    }
};
