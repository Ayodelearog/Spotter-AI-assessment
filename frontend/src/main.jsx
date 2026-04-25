import React from "react";
import ReactDOM from "react-dom/client";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import App from "./App";
import "./styles.css";

const theme = createTheme({
  palette: {
    primary: {
      main: "#0f766e",
    },
    secondary: {
      main: "#f97316",
    },
    background: {
      default: "#f4efe5",
      paper: "#fffdf8",
    },
  },
  typography: {
    fontFamily: '"Avenir Next", "Segoe UI", sans-serif',
  },
  shape: {
    borderRadius: 20,
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);
