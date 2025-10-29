"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

export default function Page() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/dashboard");
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        router.replace("/dashboard");
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        if (data.session) {
          router.replace("/dashboard");
        } else {
          setNotice("Signup successful. Check your email to confirm.");
        }
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        textAlign: "center",
      }}
    >
      <div
        className="card pad"
        style={{ width: "100%", maxWidth: 700, padding: "36px", margin: "0 auto" }}
      >
        <h1 className="h1" style={{ marginBottom: 8, textAlign: "center" }}>
          Sign {mode === "signin" ? "In" : "Up"}
        </h1>
        <p className="help" style={{ marginTop: -10, marginBottom: 24 }}>
          Use your email and password.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 18 }}>
          <input
            className="input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ padding: "16px", fontSize: "16px", width: "100%" }}
          />
          <input
            className="input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ padding: "16px", fontSize: "16px", width: "100%" }}
          />
          {error ? <div style={{ color: "var(--neg)", textAlign: "center" }}>{error}</div> : null}
          {notice ? <div style={{ color: "var(--pos)", textAlign: "center" }}>{notice}</div> : null}
          <button
            className="input"
            type="submit"
            disabled={loading}
            style={{ padding: "16px", fontSize: "16px", width: "100%" }}
          >
            {loading ? "Please wait..." : mode === "signin" ? "Sign In" : "Sign Up"}
          </button>
        </form>

        <div style={{ marginTop: 20 }}>
          {mode === "signin" ? (
            <button
              className="input"
              onClick={() => setMode("signup")}
              style={{ padding: "14px", width: "100%" }}
            >
              Create an account
            </button>
          ) : (
            <button
              className="input"
              onClick={() => setMode("signin")}
              style={{ padding: "14px", width: "100%" }}
            >
              Already have an account? Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
