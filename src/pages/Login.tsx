import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isDisplayNameAvailable, setIsDisplayNameAvailable] = useState<boolean | null>(null);
  const [checkingDisplayName, setCheckingDisplayName] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          navigate("/fantasy");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Check display name availability with debouncing
  useEffect(() => {
    if (!displayName.trim() || isLogin) {
      setIsDisplayNameAvailable(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setCheckingDisplayName(true);
      try {
        const { data, error } = await supabase.rpc('check_display_name_available', {
          name: displayName.trim()
        });
        
        if (error) {
          console.error('Error checking display name:', error);
          setIsDisplayNameAvailable(null);
        } else {
          setIsDisplayNameAvailable(data);
        }
      } catch (error) {
        console.error('Error checking display name:', error);
        setIsDisplayNameAvailable(null);
      } finally {
        setCheckingDisplayName(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [displayName, isLogin]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast({
          title: "Successfully logged in!",
          description: "Welcome back!",
        });
      } else {
        // Validation for registration
        if (email !== confirmEmail) {
          toast({
            title: "Error",
            description: "Email addresses do not match",
            variant: "destructive",
          });
          return;
        }
        if (password !== confirmPassword) {
          toast({
            title: "Error", 
            description: "Passwords do not match",
            variant: "destructive",
          });
          return;
        }

        if (!displayName.trim()) {
          toast({
            title: "Error",
            description: "Display name is required",
            variant: "destructive",
          });
          return;
        }

        if (isDisplayNameAvailable === false) {
          toast({
            title: "Error",
            description: "Display name is already taken",
            variant: "destructive",
          });
          return;
        }

        if (isDisplayNameAvailable === null) {
          toast({
            title: "Error",
            description: "Please wait while we check display name availability",
            variant: "destructive",
          });
          return;
        }
        
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/fantasy`,
            data: {
              display_name: displayName.trim()
            }
          }
        });
        if (error) throw error;
        toast({
          title: "Registration successful!",
          description: "Please check your email for confirmation.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-roboto">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            RocketLeague Fantasy Pro
          </Link>
        </div>
        
        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-foreground">
              {isLogin ? "Welcome Back" : "Create Account"}
            </CardTitle>
            <CardDescription>
              {isLogin ? "Sign in to your account" : "Create a new account to get started"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-input border-border"
                />
              </div>
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="confirmEmail">Confirm Email</Label>
                  <Input
                    id="confirmEmail"
                    type="email"
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    required
                    className="bg-input border-border"
                  />
                 </div>
               )}
               {!isLogin && (
                 <div className="space-y-2">
                   <Label htmlFor="displayName">Display Name</Label>
                   <Input
                     id="displayName"
                     type="text"
                     value={displayName}
                     onChange={(e) => setDisplayName(e.target.value)}
                     required
                     className="bg-input border-border"
                     placeholder="Choose a unique display name"
                   />
                   {displayName.trim() && (
                     <div className="text-xs">
                       {checkingDisplayName ? (
                         <span className="text-muted-foreground">Checking availability...</span>
                       ) : isDisplayNameAvailable === true ? (
                         <span className="text-green-500">✓ Display name is available</span>
                       ) : isDisplayNameAvailable === false ? (
                         <span className="text-red-500">✗ Display name is already taken</span>
                       ) : null}
                     </div>
                   )}
                 </div>
               )}
               <div className="space-y-2">
                 <Label htmlFor="password">Password</Label>
                 <Input
                   id="password"
                   type="password"
                   value={password}
                   onChange={(e) => setPassword(e.target.value)}
                   required
                   className="bg-input border-border"
                 />
               </div>
               {!isLogin && (
                 <div className="space-y-2">
                   <Label htmlFor="confirmPassword">Confirm Password</Label>
                   <Input
                     id="confirmPassword"
                     type="password"
                     value={confirmPassword}
                     onChange={(e) => setConfirmPassword(e.target.value)}
                     required
                     className="bg-input border-border"
                   />
                </div>
              )}
               <Button 
                 type="submit" 
                 className="w-full bg-gradient-primary text-primary-foreground font-medium hover:shadow-glow transition-smooth"
                 disabled={loading || (!isLogin && (checkingDisplayName || isDisplayNameAvailable === false))}
               >
                 {loading ? "Loading..." : (isLogin ? "Sign In" : "Create Account")}
              </Button>
            </form>
            
            <div className="mt-4 text-center">
              <Button
                variant="ghost"
                onClick={() => setIsLogin(!isLogin)}
                className="text-muted-foreground hover:text-foreground"
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;