import React from "react";
import ReactDOM from "react-dom/client";
import {
    createBrowserRouter,
    RouterProvider,
} from "react-router-dom";

import EditPaper from "./routes/EditPaper";
import Home from "./routes/Home";

import "./styles/global.css";


// This is the main entry point of your React application
// You need to set up React Router here to enable client-side routing
// Requirements:
// 1. Create a router configuration using createBrowserRouter
// 2. Set up two routes:
//    - Home route ("/") should render the Home component
//    - Edit route ("/edit/:id") should render the EditPaper component
//    Note: ":id" is a URL parameter that will be used to identify which paper to edit

const router = createBrowserRouter([
    {
        path: "/",
        element: <Home/>,
    },
    {
        path: "/edit/:id",
        element: <EditPaper/>,
    },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <RouterProvider router={router}/>
    </React.StrictMode>
);
