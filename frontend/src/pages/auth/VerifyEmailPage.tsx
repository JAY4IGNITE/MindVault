import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Mail, RefreshCw, LogOut, Loader2, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { sendEmailVerification } from 'firebase/auth';

const VerifyEmailPage: React.FC = () => {
  const { currentUser, signOut } = useAuth();
  const navigate = useNavigate();
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isReloading, setIsReloading] = useState(false);

  const handleResend = async () => {
    if (!currentUser) return;
    setIsResending(true);
    setResendStatus('idle');
    try {
      // @ts-ignore
      if (typeof sendEmailVerification === 'function' && currentUser.emailVerified !== undefined) {
        await sendEmailVerification(currentUser as any);
        setResendStatus('success');
      }
    } catch (e) {
      console.error('Failed to resend verification email', e);
      setResendStatus('error');
    } finally {
      setIsResending(false);
    }
  };

  const handleCheckVerification = async () => {
    if (!currentUser) return;
    setIsReloading(true);
    try {
      // @ts-ignore
      if (typeof (currentUser as any).reload === 'function') {
        // @ts-ignore
        await (currentUser as any).reload();
      }
      // Give auth state a tiny moment to update
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
        setIsReloading(false);
      }, 500);
    } catch (e) {
      setIsReloading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 bg-accent/10 rounded-full flex items-center justify-center border border-accent/20">
            <Mail className="h-8 w-8 text-accent" />
          </div>
        </div>

        <Card className="shadow-lg border-border">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-display text-primary-dark">Verify your email</CardTitle>
            <CardDescription className="text-sm mt-2">
              We sent a verification link to <span className="font-semibold text-primary">{currentUser?.email}</span>.
              Please check your inbox and verify your email to unlock the vault.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            
            {resendStatus === 'success' && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2 text-emerald-800 text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                <p>Verification email sent! Please check your spam folder if you don't see it.</p>
              </div>
            )}

            {resendStatus === 'error' && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                Failed to send email. Please wait a moment and try again.
              </div>
            )}

            <div className="space-y-3">
              <Button 
                onClick={handleCheckVerification} 
                disabled={isReloading}
                className="w-full gap-2 text-sm h-11"
              >
                {isReloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                I've verified my email
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleResend} 
                disabled={isResending}
                className="w-full gap-2 text-sm border-border shadow-subtle h-11"
              >
                {isResending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Resend verification email
              </Button>
            </div>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
            </div>

            <Button 
              variant="ghost" 
              onClick={handleSignOut}
              className="w-full gap-2 text-sm text-secondary hover:text-primary"
            >
              <LogOut className="h-4 w-4" /> Sign out and return to login
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
