import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { loginUser } from "../api/authApi";
import { useAuth } from "../context/AuthContext";
import notesManagerLogo from '../assets/images/notes-manager.png'
import { useNavigate, Link, Navigate, useSearchParams } from "react-router-dom";
import '../assets/styles/login.css'

export default function Login() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const { login } = useAuth();
  const [query] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);


  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password)
      return toast.error("Please fill all fields");

    try {
      const data = await loginUser(formData);
      toast.success(`Welcome back, ${data?.name || "User"}!`);
      login(data);
      navigate("/"); 
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Login failed");
    }
  };

  useEffect(() => {
    if (query.get("sessionExpired")) {
      toast.error("Your session expired. Please login again.");
    }
  }, []);

  return (
    <div className="login-container">

      <img src={notesManagerLogo} alt="logo" />

    <div className="login-card" >
      <h2>Welcome back</h2>
      <form onSubmit={handleSubmit}>
        <input  
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={(e) =>
            setFormData({ ...formData, [e.target.name]: e.target.value })
          } 
        />
        <input  
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={(e) =>
            setFormData({ ...formData, [e.target.name]: e.target.value })
          }
        />
        <button type="submit" className="btn" disabled={loading}>{loading ? "Signing in..." : "Login"}</button>
      </form>
      <p className="meta" style={{ marginTop: 12 }}>
        No account? <Link to="/register">Create one</Link>
      </p>
    </div>
    </div>
  );
}
