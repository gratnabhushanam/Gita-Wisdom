import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, Check, Eye, EyeOff, Sparkles, Shield, X, BookOpen } from 'lucide-react';
import heroImage from '../assets/hero.png';
import '../styles/auth.css';

export default function Register() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [infoMessage, setInfoMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const getPasswordStrength = (password) => {
    if (!password) {
      return { strength: 0, label: '', color: 'bg-white/10' };
    }

    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (password.length >= 12) strength += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 1;
    if (/[\d]/.test(password)) strength += 1;
    if (/[^a-zA-Z\d]/.test(password)) strength += 1;

    const levels = [
      { strength: 1, label: 'Weak', color: 'bg-red-500' },
      { strength: 2, label: 'Fair', color: 'bg-orange-500' },
      { strength: 3, label: 'Good', color: 'bg-yellow-500' },
      { strength: 4, label: 'Strong', color: 'bg-lime-500' },
      { strength: 5, label: 'Very Strong', color: 'bg-green-500' },
    ];

    return levels[Math.min(Math.max(strength - 1, 0), 4)] || { strength: 0, label: '', color: 'bg-white/10' };
  };

  const handleEmailChange = (event) => {
    const email = event.target.value;
    setFormData((current) => ({ ...current, email }));
    setEmailError(email && !validateEmail(email) ? 'Please enter a valid email address' : '');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setInfoMessage('');

    if (!validateEmail(formData.email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (!agreedToTerms) {
      setError('Please agree to Terms & Conditions');
      return;
    }

    setLoading(true);

    try {
      const response = await register(formData.name, formData.email, formData.password);
      const pendingRegistration = {
        name: formData.name,
        email: response.email || formData.email,
        retryAfterSeconds: Number(response.retryAfterSeconds || 60),
        createdAt: Date.now(),
      };
      sessionStorage.setItem('pending_registration_v1', JSON.stringify(pendingRegistration));
      setInfoMessage('OTP sent to your email. Redirecting to verification...');
      navigate('/register/verify-otp', {
        replace: true,
        state: {
          email: pendingRegistration.email,
          retryAfterSeconds: pendingRegistration.retryAfterSeconds,
        },
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <div className="auth-page flex min-h-screen items-start px-4 py-6 sm:px-6 lg:px-8">
      <div className="auth-stage mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:gap-8">
        <section className="auth-card order-2 rounded-[2rem] p-6 sm:p-8 lg:order-1 lg:sticky lg:top-8 lg:self-start">
          <div className="relative z-10">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-[0.7rem] font-bold uppercase tracking-[0.32em] text-[#f7d77d]/85">Join the path</p>
                <h2 className="mt-2 text-3xl font-serif font-black uppercase tracking-tight text-white">Create one</h2>
              </div>
              <Link to="/home" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white/80 transition-colors hover:text-[#f7d77d]">
                Home
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mb-5 rounded-2xl border border-[#f7d77d]/20 bg-[#f7d77d]/8 p-4 text-sm text-white/80">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-[#f7d77d] underline decoration-[#f7d77d]/40 underline-offset-4">
                Sign in here
              </Link>
            </div>

            <p className="mb-5 text-xs uppercase tracking-[0.2em] text-white/50">
              Account creation happens only after OTP verification.
            </p>

            {error && (
              <div className="mb-5 rounded-2xl border border-red-400/25 bg-red-500/10 p-4 text-sm text-red-200">
                {error}
              </div>
            )}

            {infoMessage && (
              <div className="mb-5 rounded-2xl border border-emerald-300/25 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                {infoMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-white/80">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Arjuna"
                  className={`auth-input ${focusedField === 'name' ? 'shadow-[0_0_0_4px_rgba(255,215,0,0.12)]' : ''}`}
                />
              </div>

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

                <div className="mt-4 space-y-3">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-all ${level <= passwordStrength.strength ? passwordStrength.color : 'bg-white/10'}`}
                      ></div>
                    ))}
                  </div>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/55">
                    Strength: <span className="font-semibold text-[#f7d77d]">{passwordStrength.label || 'Build your password'}</span>
                  </p>
                  <ul className="space-y-1 text-xs text-white/65">
                    <li className={`flex items-center gap-2 ${formData.password.length >= 8 ? 'text-green-300' : ''}`}>
                      {formData.password.length >= 8 ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                      At least 8 characters
                    </li>
                    <li className={`flex items-center gap-2 ${/[a-z]/.test(formData.password) && /[A-Z]/.test(formData.password) ? 'text-green-300' : ''}`}>
                      {/[a-z]/.test(formData.password) && /[A-Z]/.test(formData.password) ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                      Mix of upper and lowercase
                    </li>
                    <li className={`flex items-center gap-2 ${/[\d]/.test(formData.password) ? 'text-green-300' : ''}`}>
                      {/[\d]/.test(formData.password) ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                      At least one number
                    </li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-1 text-sm text-white/65">
                <input
                  id="terms"
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(event) => setAgreedToTerms(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-white/20 bg-white/10 text-[#f7d77d] focus:ring-[#f7d77d]"
                />
                <label htmlFor="terms">I agree to the Terms & Conditions.</label>
              </div>

              <button type="submit" disabled={loading} className="auth-button mt-2 w-full px-5 py-3.5">
                {loading ? 'Please wait...' : 'Send OTP'}
              </button>
            </form>

            <div className="auth-divider my-6 flex items-center justify-center">
              <span className="relative z-10 bg-[#0d1520] px-3 text-xs uppercase tracking-[0.28em] text-white/45">or</span>
            </div>

            <p className="text-center text-sm text-white/70">
              Already have an account?{' '}
              <Link to="/login" className="auth-link">
                Sign in
              </Link>
            </p>
          </div>
        </section>

        <section className="auth-hero order-1 rounded-[2rem] p-6 sm:p-8 lg:order-2 lg:p-10">
          <div className="relative z-10 flex h-full flex-col gap-8">
            <div className="space-y-6">
              <div className="auth-badge w-fit">
                <Sparkles className="h-3.5 w-3.5" />
                New journey
              </div>

              <div className="max-w-2xl space-y-5">
                <h1 className="text-5xl font-serif font-black uppercase leading-none tracking-tight text-[#f7d77d] sm:text-7xl">
                  Create one
                </h1>
                <p className="auth-quote max-w-xl text-lg leading-relaxed sm:text-xl">
                  Start the old-style spiritual path with the same glowing Krishna background, golden borders, and warm devotional tone.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
                  <Shield className="mb-3 h-5 w-5 text-[#f7d77d]" />
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/90">Secure</p>
                  <p className="mt-1 text-xs text-white/70">Your account is protected with the same simple flow.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
                  <Sparkles className="mb-3 h-5 w-5 text-[#f7d77d]" />
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/90">Bright</p>
                  <p className="mt-1 text-xs text-white/70">Old gold colors and soft light guide the screen.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
                  <BookOpen className="mb-3 h-5 w-5 text-[#f7d77d]" />
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/90">Begin</p>
                  <p className="mt-1 text-xs text-white/70">Join the Gita Wisdom learning flow from day one.</p>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-black/20 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.32)] sm:p-6">
              <div className="absolute inset-0 bg-gradient-to-t from-[#06101e]/90 via-transparent to-transparent"></div>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_30%,rgba(255,215,0,0.18),transparent_30%),radial-gradient(circle_at_80%_70%,rgba(255,164,54,0.12),transparent_24%)]"></div>
              <img src={heroImage} alt="Krishna theme" className="auth-floating-image relative z-10 w-full rounded-[1.4rem] object-cover shadow-[0_20px_50px_rgba(0,0,0,0.35)]" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
