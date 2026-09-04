import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createUserWithEmailAndPassword, sendEmailVerification, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { Brain, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const signupSchema = z
  .object({
    email: z.string().email({ message: 'Invalid email address' }),
    password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type SignupFormValues = z.infer<typeof signupSchema>;

const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormValues) => {
    setIsLoading(true);
    setAuthError(null);

    try {
      const userCred = await createUserWithEmailAndPassword(auth, data.email, data.password);
      try {
        await sendEmailVerification(userCred.user);
      } catch (verifyErr) {
        console.warn('Failed to send verification email:', verifyErr);
      }
      navigate('/dashboard');
    } catch (error: any) {
      let errorMessage = 'Failed to create account.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password must be at least 6 characters.';
      }
      setAuthError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate('/dashboard');
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') return;
      setAuthError('Failed to sign up with Google.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-4">
      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      {/* Intense Ambient Background */}
      <div className="absolute inset-0 pointer-events-none opacity-60">
        <div className="absolute -top-[10%] -right-[10%] w-[60%] h-[60%] rounded-full bg-blue-600/20 blur-[140px]" />
        <div className="absolute top-[40%] -left-[10%] w-[60%] h-[60%] rounded-full bg-purple-600/20 blur-[140px]" />
      </div>

      <div className="w-full max-w-[420px] relative z-10 animate-slide-up">
        <div className="flex flex-col items-center space-y-4 text-center mb-8">
          <div className="h-16 w-16 bg-foreground/10 rounded-2xl flex items-center justify-center shadow-glow border border-foreground/10 overflow-hidden p-2.5">
            <img src="/logo.png" alt="MindVault AI Logo" className="h-full w-full object-contain drop-shadow-md" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Welcome to MindVault</h1>
            <p className="text-sm text-muted-foreground mt-2">Initialize your cryptographically isolated session</p>
          </div>
        </div>

        <Card className="border-foreground/10 bg-background/60 backdrop-blur-2xl shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle>Sign Up</CardTitle>
            <CardDescription>Create a new vault to securely store your data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {authError && (
                <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm flex items-center gap-2 border border-destructive/20 font-medium">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <Input
                id="email"
                type="email"
                label="Email"
                placeholder="name@example.com"
                {...register('email')}
                error={errors.email?.message}
                disabled={isLoading}
              />

              <Input
                id="password"
                type="password"
                label="Password"
                placeholder="••••••••"
                {...register('password')}
                error={errors.password?.message}
                disabled={isLoading}
              />

              <Input
                id="confirmPassword"
                type="password"
                label="Confirm Password"
                placeholder="••••••••"
                {...register('confirmPassword')}
                error={errors.confirmPassword?.message}
                disabled={isLoading}
              />

              <Button type="submit" className="w-full mt-2 text-sm h-12 rounded-xl" isLoading={isLoading}>
                Create Secure Vault
              </Button>
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-foreground/10" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold">
                <span className="bg-[#0b0c0e] px-3 text-muted-foreground/70">Or continue with</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full gap-3 h-12 rounded-xl"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </Button>

            <div className="text-center text-sm text-muted-foreground pt-4">
              Already have a vault?{' '}
              <Link to="/login" className="text-white hover:underline font-medium transition-colors">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignupPage;
