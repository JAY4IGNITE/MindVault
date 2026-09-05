import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { GoogleIcon } from '../../components/ui/GoogleIcon';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { errorEntrance, transitions, fadeIn } from '../../lib/motion';

const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;


const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const from = location.state?.from?.pathname || '/dashboard';

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      navigate(from, { replace: true });
    } catch (error: any) {
      let msg = 'Failed to sign in. Please verify your credentials.';
      if (['auth/user-not-found', 'auth/wrong-password', 'auth/invalid-credential'].includes(error.code)) msg = 'Invalid email or password.';
      else if (error.code === 'auth/too-many-requests') msg = 'Too many failed attempts. Please try again later.';
      setAuthError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      navigate(from, { replace: true });
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') return;
      setAuthError('Failed to sign in with Google.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      className="h-screen h-[100dvh] w-full flex flex-col bg-background relative overflow-hidden"
      variants={fadeIn}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={transitions.normal}
    >
      {/* Theme Toggle */}
      <div className="absolute top-4 sm:top-6 right-4 sm:right-6 z-50">
        <ThemeToggle />
      </div>

      {/* Subtle Background Glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-[15%] -left-[10%] w-[55%] h-[55%] rounded-full bg-blue-500/10 dark:bg-blue-600/15 blur-[120px]" />
        <div className="absolute top-[40%] -right-[10%] w-[50%] h-[55%] rounded-full bg-violet-500/10 dark:bg-violet-600/15 blur-[120px]" />
      </div>

      {/* Centered Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-2 sm:py-3 overflow-hidden">
        <motion.div
          className="w-full max-w-[430px]"
          initial="initial"
          animate="animate"
          variants={{
            initial: {},
            animate: { transition: { staggerChildren: 0.08 } },
          }}
        >
          {/* Brand Header */}
          <motion.div
            className="flex flex-col items-center text-center mb-3 sm:mb-4"
            variants={{ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } } }}
          >
            <div className="h-[52px] w-[52px] sm:h-[58px] sm:w-[58px] mb-2 flex items-center justify-center">
              <img src="/logo-128.webp" width={58} height={58} alt="MindVault AI" className="w-full h-full object-contain drop-shadow-sm" />
            </div>
            <h1 className="text-[24px] sm:text-[26px] font-display font-bold text-foreground leading-tight tracking-tight">
              Welcome to MindVault
            </h1>
            <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-1 leading-normal">
              Authenticate your cryptographically isolated session
            </p>
          </motion.div>

          {/* Auth Card */}
          <motion.div
            variants={{ initial: { opacity: 0, y: 16, scale: 0.98 }, animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } } }}
            className="rounded-[24px] border border-foreground/[0.08] bg-background/80 dark:bg-foreground/[0.02] backdrop-blur-2xl shadow-[0_4px_24px_-4px_rgba(0,0,0,0.12),0_1px_6px_-1px_rgba(0,0,0,0.08)] p-5 sm:p-6"
          >
            {/* Card Title */}
            <div className="mb-3.5">
              <h2 className="text-[16px] sm:text-[17px] font-semibold text-foreground tracking-tight leading-none">Sign In</h2>
              <p className="text-[12px] text-muted-foreground mt-1">Enter your credentials to decrypt your vault.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-2.5 sm:space-y-3">
              {/* Animated Error */}
              <AnimatePresence mode="wait">
                {authError && (
                  <motion.div
                    key="error"
                    variants={errorEntrance}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.22 }}
                    className="overflow-hidden"
                  >
                    <div className="p-2.5 rounded-xl bg-destructive/10 text-destructive text-xs flex items-center gap-2 border border-destructive/20">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{authError}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <Input id="email" type="email" label="Email" placeholder="name@example.com" {...register('email')} error={errors.email?.message} disabled={isLoading} />
              <Input id="password" type="password" label="Password" placeholder="••••••••" {...register('password')} error={errors.password?.message} disabled={isLoading} />

              <Button type="submit" className="w-full h-[42px] sm:h-[44px] text-sm rounded-xl font-medium mt-1" isLoading={isLoading}>
                Sign In to Vault
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-3 sm:my-3.5">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-foreground/10" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 text-[10px] sm:text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 bg-background dark:bg-[#0b0c10]">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Google */}
            <Button
              type="button"
              variant="outline"
              className="google-auth-button w-full h-[42px] sm:h-[44px] rounded-xl text-sm font-medium flex items-center justify-center gap-2.5 overflow-hidden"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              <GoogleIcon />
              <span>Continue with Google</span>
            </Button>

            {/* Secondary Link */}
            <p className="mt-3.5 sm:mt-4 text-center text-xs sm:text-[13px] text-muted-foreground">
              Don't have a vault yet?{' '}
              <Link to="/signup" className="text-foreground font-semibold hover:underline underline-offset-4 decoration-foreground/30 transition-all">
                Sign Up
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default LoginPage;
