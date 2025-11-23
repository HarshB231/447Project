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
  const [sessionChecked, setSessionChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setHasSession(!!data.session);
      setSessionChecked(true);
    });
    return () => { active = false; };
  }, []);

  async function handleSignOut() {
    setLoading(true);
    await supabase.auth.signOut();
    setLoading(false);
    setHasSession(false);
    setMode("signin");
    setEmail("");
    setPassword("");
  }

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
    <div className="login-screen pattern-bg">
      <div className="login-center">
        <div className="login-card card">
          <div className="login-brand" style={{justifyContent:'center', marginBottom:36}}>
            <img src="/UMBCLogo.png" alt="UMBC Logo" className="login-logo" />
            <h1 className="login-title" style={{fontSize:46}}>VMS<span className="login-accent">UMBC</span></h1>
          </div>
          {!sessionChecked ? (
            <p className="login-msg notice">Checking session...</p>
          ) : hasSession ? (
            <div className="login-form" style={{textAlign:"center"}}>
              <h2 className="login-heading" style={{marginTop:0}}>Already Signed In</h2>
              <p className="login-sub">You are currently authenticated.</p>
              <div style={{display:"flex", gap:"16px", flexWrap:"wrap", justifyContent:"center"}}>
                <button className="btn login-submit" onClick={() => router.replace('/dashboard')} disabled={loading}>Go to Dashboard</button>
                <button className="btn-soft login-switch" onClick={handleSignOut} disabled={loading}>Sign Out</button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="login-heading" style={{marginTop:0}}>Sign {mode === "signin" ? "In" : "Up"}</h2>
              <p className="login-sub">Use your email and password.</p>
              <form onSubmit={handleSubmit} className="login-form">
                <label className="login-field">
                  <span className="visually-hidden">Email</span>
                  <input
                    className="input login-input"
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </label>
                <label className="login-field">
                  <span className="visually-hidden">Password</span>
                  <input
                    className="input login-input"
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </label>
                {error ? <div className="login-msg error">{error}</div> : null}
                {notice ? <div className="login-msg notice">{notice}</div> : null}
                <button className="btn login-submit" type="submit" disabled={loading}>
                  {loading ? "Please wait..." : mode === "signin" ? "Sign In" : "Sign Up"}
                </button>
              </form>
              <div className="login-alt">
                {mode === "signin" ? (
                  <button className="btn-soft login-switch" onClick={() => setMode("signup")}>Create an account</button>
                ) : (
                  <button className="btn-soft login-switch" onClick={() => setMode("signin")}>Already have an account? Sign In</button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
