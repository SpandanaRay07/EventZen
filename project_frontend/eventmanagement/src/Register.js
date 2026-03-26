import { Link, useNavigate, useSearchParams } from "react-router-dom";

import "./style/register.css";

function safeInternalPath(next) {
  if (!next || typeof next !== "string") return null;
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextParam = safeInternalPath(searchParams.get("next"));

  const handleRegForm = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get("name")?.trim();
    const email = formData.get("email")?.trim();
    const password = formData.get("password")?.trim();
    const confirmPassword = formData.get("confirmPassword")?.trim();
    const role = formData.get("role");

    if (!name || !email || !password || !confirmPassword || !role) {
      alert("Missing fields");
      return;
    }

    const user = { name, email, password, role, confirmPass: confirmPassword };

    try {
      const response = await fetch("http://localhost:8081/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
      });

      if (!response.ok) {
        const errorText = await response.text();
        alert(errorText || "Failed to register");
        return;
      }

      const data = await response.json();
      alert("User Registered Successfully");
      localStorage.setItem("user", JSON.stringify(data));
      window.dispatchEvent(new Event("authChanged"));
      const roleName = String(data?.role || "").toLowerCase();
      if (roleName === "attendee") {
        navigate(nextParam || "/home/events");
      } else {
        navigate(nextParam || "/home");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Could not reach server");
    }
  };

  return (
    <div className="Auth-page">
      <div className="Auth-card">
        <div className="Auth-logo">EVENTZEN</div>
        <h1 className="Auth-title">Create account</h1>
        <p className="Auth-subtitle">Get started for free</p>

        <form onSubmit={handleRegForm} className="Auth-form">
          <div className="Auth-field">
            <label className="Auth-label">Name</label>
            <input className="Auth-input" type="text" name="name" placeholder="Your full name" />
          </div>

          <div className="Auth-field">
            <label className="Auth-label">Email</label>
            <input className="Auth-input" type="email" name="email" placeholder="you@example.com" />
          </div>

          <div className="Auth-field">
            <label className="Auth-label">Password</label>
            <input className="Auth-input" type="password" name="password" placeholder="••••••••" />
          </div>

          <div className="Auth-field">
            <label className="Auth-label">Confirm Password</label>
            <input className="Auth-input" type="password" name="confirmPassword" placeholder="••••••••" />
          </div>

          <div className="Auth-field">
            <label className="Auth-label">Role</label>
            <select className="Auth-input" name="role">
              <option value="admin">Admin</option>
              <option value="user">User</option>
              <option value="attendee">Attendee</option>
            </select>
          </div>

          <button type="submit" className="Auth-submit">Create Account</button>
        </form>

        <p className="Auth-footer">
          Already registered?{" "}
          <Link
            to={nextParam ? `/login?next=${encodeURIComponent(nextParam)}` : "/login"}
            className="Auth-link"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;