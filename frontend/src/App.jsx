import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { useAuth } from "./context/AuthContext";
import Dashboard from "./pages/Dashboard";

function App() {

  const { user } = useAuth();

  return (
      <BrowserRouter>
        <Routes>
          {
            !user && (
              <>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="*" element={<Navigate to="/login" />} />
              </>
            )
          }
          {
            user && 
            (
              <>
                <Route
                  path="/"
                  element={
                      <Dashboard />
                  }
                />
                <Route path="*" element={<Navigate to="/" />} />
              </>
            )
          }
        </Routes>
      </BrowserRouter>
  );
}

export default App;
