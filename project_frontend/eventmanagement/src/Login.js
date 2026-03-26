import { Link, useNavigate, useSearchParams } from "react-router-dom";

import "./style/login.css";

function safeInternalPath(next) {
  if (!next || typeof next !== "string") return null;
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextParam = safeInternalPath(searchParams.get("next"));

  const handleLoginForm = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = formData.get("email")?.trim();
    const password = formData.get("password")?.trim();

    if (!email || !password) {
      alert("Please enter both email and password");
      return;
    }

    try {
      const response = await fetch("http://localhost:8081/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        alert(errorText || "Invalid credentials");
        return;
      }

      const userData = await response.json();
      localStorage.setItem("user", JSON.stringify(userData));
      window.dispatchEvent(new Event("authChanged"));
      alert("Login Successful!");
      const role = String(userData?.role || "").toLowerCase();
      let dest = nextParam;
      if (!dest) {
        dest = role === "attendee" ? "/home/events" : "/home";
      }
      navigate(dest);
    } catch (error) {
      console.error("Error:", error);
      alert("Could not reach server");
    }
  };

  return (
    <div className="Auth-page">
      <div className="Auth-card">
        <div className="Auth-logo">EVENTZEN</div>
        <h1 className="Auth-title">Welcome back</h1>
        <p className="Auth-subtitle">Sign in to your account</p>

        <form onSubmit={handleLoginForm} className="Auth-form">
          <div className="Auth-field">
            <label className="Auth-label">Email</label>
            <input className="Auth-input" type="email" name="email" placeholder="you@example.com" required />
          </div>

          <div className="Auth-field">
            <label className="Auth-label">Password</label>
            <input className="Auth-input" type="password" name="password" placeholder="••••••••" required />
          </div>

          <button type="submit" className="Auth-submit">Sign In</button>
        </form>

        <p className="Auth-footer">
          Not registered yet?{" "}
          <Link
            to={nextParam ? `/register?next=${encodeURIComponent(nextParam)}` : "/register"}
            className="Auth-link"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;