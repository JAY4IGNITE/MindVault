import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Brain, AlertCircle, Sparkles, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setDevUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const from = location.state?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'demo@mindvault.ai',
      password: 'password123',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setAuthError(null);

    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      navigate(from, { replace: true });
    } catch (error: any) {
      console.warn('Firebase login failed, offering dev login fallback:', error);
      // If Firebase emulator/project isn't configured in this local run, offer convenient fallback
      if (
        error.code === 'auth/invalid-api-key' ||
        error.code === 'auth/network-request-failed' ||
        error.code === 'auth/configuration-not-found'
      ) {
        setDevUser(data.email);
        navigate(from, { replace: true });
        return;
      }

      let errorMessage = 'Failed to sign in. Please verify your credentials.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      }
      setAuthError(errorMessage);
      setIsLoading(false);
    }
  };

  const handleQuickDemoAccess = () => {
    setDevUser('alex.mercer@mindvault.ai');
    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="h-12 w-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-premium">
            <Brain className="h-7 w-7 text-sky-400" />
          </div>
          <h1 className="text-2xl font-bold font-display text-primary-dark">Welcome to MindVault</h1>
          <p className="text-xs text-secondary">Authenticate your cryptographically isolated session</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Sign In</CardTitle>
            <CardDescription>Enter your credentials to decrypt and access your private vault.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {authError && (
                <div className="p-3 rounded-lg bg-error/10 text-error text-xs flex items-center gap-2 border border-error/20">
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

              <Button type="submit" variant="default" className="w-full shadow-sm" isLoading={isLoading}>
                Sign In to Vault
              </Button>
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-surface px-2 text-muted font-medium">Local Dev Fast-Track</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full gap-2 text-xs border-dashed border-accent/40 text-accent hover:bg-accent-light/40"
              onClick={handleQuickDemoAccess}
            >
              <Sparkles className="h-3.5 w-3.5" /> Instant Demo Session (No Firebase config required)
            </Button>

            <div className="text-center text-xs text-secondary pt-2">
              Don't have a vault yet?{' '}
              <Link to="/signup" className="text-accent hover:underline font-semibold">
                Open a new vault
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-center gap-2 text-[11px] text-muted">
          <ShieldCheck className="h-3.5 w-3.5 text-success" />
          <span>Protected under MindVault Security Constitution</span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
