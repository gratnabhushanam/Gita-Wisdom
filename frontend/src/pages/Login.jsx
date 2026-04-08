import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, Sparkles, Shield, BookOpen, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import heroImage from '../assets/hero.png';
import '../styles/auth.css';

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleEmailChange = (event) => {
    const email = event.target.value;
    setFormData((current) => ({ ...current, email }));
    setEmailError(email && !validateEmail(email) ? 'Please enter a valid email address' : '');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!validateEmail(formData.email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      await login(formData.email, formData.password);
      navigate('/kids', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page flex min-h-screen items-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="auth-stage mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
        <section className="auth-hero rounded-[2rem] p-6 sm:p-8 lg:p-10">
          <div className="relative z-10 flex h-full flex-col gap-8">
            <div className="space-y-6">
              <div className="auth-badge w-fit">
                <Sparkles className="h-3.5 w-3.5" />
                Krishna Flow
              </div>

              <div className="max-w-2xl space-y-5">
                <h1 className="text-5xl font-serif font-black uppercase leading-none tracking-tight text-[#f7d77d] sm:text-7xl">
                  Gita Wisdom
                </h1>
                <p className="auth-quote max-w-xl text-lg leading-relaxed sm:text-xl">
                  Enter the old spiritual doorway. The same calm colors, glowing gold light, and Krishna background now guide your sign-in path.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
                  <BookOpen className="mb-3 h-5 w-5 text-[#f7d77d]" />
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/90">Learn</p>
                  <p className="mt-1 text-xs text-white/70">Daily sloka, mentor, and chapter flow.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
                  <Heart className="mb-3 h-5 w-5 text-[#f7d77d]" />
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/90">Stay close</p>
                  <p className="mt-1 text-xs text-white/70">Warm colors and soft light from the old site.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
                  <Shield className="mb-3 h-5 w-5 text-[#f7d77d]" />
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/90">Protected</p>
                  <p className="mt-1 text-xs text-white/70">Login stays secure while the styling stays classic.</p>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-black/20 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.32)] sm:p-6">
              <div className="absolute inset-0 bg-gradient-to-t from-[#06101e]/90 via-transparent to-transparent"></div>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,215,0,0.18),transparent_30%),radial-gradient(circle_at_70%_70%,rgba(255,164,54,0.12),transparent_24%)]"></div>
              <img src={heroImage} alt="Krishna theme" className="auth-floating-image relative z-10 w-full rounded-[1.4rem] object-cover shadow-[0_20px_50px_rgba(0,0,0,0.35)]" />
            </div>
          </div>
        </section>

        <section className="auth-card rounded-[2rem] p-6 sm:p-8">
          <div className="relative z-10">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-[0.7rem] font-bold uppercase tracking-[0.32em] text-[#f7d77d]/85">Welcome back</p>
                <h2 className="mt-2 text-3xl font-serif font-black uppercase tracking-tight text-white">Sign in</h2>
              </div>
              <Link to="/home" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white/80 transition-colors hover:text-[#f7d77d]">
                Home
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {error && (
              <div className="mb-5 rounded-2xl border border-red-400/25 bg-red-500/10 p-4 text-sm text-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-white/80">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleEmailChange}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="arjuna@example.com"
                  className={`auth-input ${focusedField === 'email' ? 'shadow-[0_0_0_4px_rgba(255,215,0,0.12)]' : ''} ${emailError ? 'border-red-400/60' : ''}`}
                />
                {emailError && <p className="mt-2 text-xs text-red-300">{emailError}</p>}
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-white/80">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={(event) => setFormData((current) => ({ ...current, password: event.target.value }))}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="••••••••"
                    className={`auth-input pr-12 ${focusedField === 'password' ? 'shadow-[0_0_0_4px_rgba(255,215,0,0.12)]' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-white/55 transition-colors hover:text-[#f7d77d]"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1 text-sm text-white/65">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="h-4 w-4 rounded border-white/20 bg-white/10 text-[#f7d77d] focus:ring-[#f7d77d]" />
                  Remember me
                </label>
                <Link to="/forgot-password" className="text-xs uppercase tracking-[0.16em] text-[#f7d77d]/80 hover:text-[#f7d77d]">
                  Forgot password?
                </Link>
              </div>

              <button type="submit" disabled={loading} className="auth-button mt-2 w-full px-5 py-3.5">
                {loading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>

            <div className="auth-divider my-6 flex items-center justify-center">
              <span className="relative z-10 bg-[#0d1520] px-3 text-xs uppercase tracking-[0.28em] text-white/45">or</span>
            </div>

            <p className="text-center text-sm text-white/70">
              New here?{' '}
              <Link to="/register" className="auth-link">
                Create one
              </Link>
            </p>
          </div>
        </section>
      </div>

    </div>
  );
}
