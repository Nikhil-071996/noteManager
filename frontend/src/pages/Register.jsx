import { useState } from "react";
import "../assets/styles/Auth.css";
import notesManagerLogo from '../assets/images/notes-manager.png'
import { toast } from "react-toastify";
import { loginUser, registerUser } from "../api/authApi";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link, Navigate } from "react-router-dom";

export default function Register() {
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);


  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.password)
      return toast.error("Please fill all fields");

    try {
      const data = await registerUser(formData);
      const LoginData = await loginUser({email : formData.email, password: formData.password});
      toast.success(data.message || "Registration successful");

      // ✅ Automatically log in user after register
      login(LoginData);
      navigate("/todos");
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className="login-container">
<img src={notesManagerLogo} alt="logo" />
    <div className="login-card">
      <h2 style={{ marginTop: 0 }}>Create account</h2>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
        <input
          type="text"
          name="name"
          placeholder="Full Name"
          onChange={handleChange}
          value={formData.name}
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          onChange={handleChange}
          value={formData.email}
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          onChange={handleChange}
          value={formData.password}
        />
        <button className="btn" type="submit" disabled={loading}>{loading ? "Creating..." : "Register"}</button>
      </form>
      <p className="meta" style={{ marginTop: 12 }}>
        Have an account? <Link to="/login">Login</Link>
      </p>
    </div>
    </div>
  );
}
