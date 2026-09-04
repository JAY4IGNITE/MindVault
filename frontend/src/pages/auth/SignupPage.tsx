import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Brain, AlertCircle, ShieldCheck, Sparkles } from 'lucide-react';
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="h-12 w-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-premium">
            <Brain className="h-7 w-7 text-sky-400" />
          </div>
          <h1 className="text-2xl font-bold font-display text-primary-dark">Create Your Private Vault</h1>
          <p className="text-xs text-secondary">Setup your unique cryptographic root container</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Sign Up</CardTitle>
            <CardDescription>Your credentials isolate your vault from all other users.</CardDescription>
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
                label="Email Address"
                placeholder="you@domain.com"
                {...register('email')}
                error={errors.email?.message}
                disabled={isLoading}
              />

              <Input
                id="password"
                type="password"
                label="Password (min 8 chars)"
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

              <Button type="submit" variant="default" className="w-full shadow-sm" isLoading={isLoading}>
                Initialize Private Vault
              </Button>
            </form>

            <div className="text-center text-xs text-secondary pt-2">
              Already have a vault?{' '}
              <Link to="/login" className="text-accent hover:underline font-semibold">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-center gap-2 text-[11px] text-muted">
          <ShieldCheck className="h-3.5 w-3.5 text-success" />
          <span>Zero third-party tracking or AI model pre-training</span>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
