import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { QueryClientProvider } from "@tanstack/react-query";
import "./styles/global.scss";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { store } from "./store/index.js";
import { queryClient } from "./lib/queryClient.js";
createRoot(document.getElementById("root")).render(
<StrictMode>
    <Provider store={store}>
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
            <AuthProvider>
                <App />
            </AuthProvider>
            </BrowserRouter>
        </QueryClientProvider>
    </Provider>
</StrictMode>);
