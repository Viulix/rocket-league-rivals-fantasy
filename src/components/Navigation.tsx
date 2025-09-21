import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/providers/ThemeProvider";
import { User } from "@supabase/supabase-js";
import { Home, User as UserIcon, LogOut, Settings, Sun, Moon } from "lucide-react";

const Navigation = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [isDisplayNameAvailable, setIsDisplayNameAvailable] = useState<boolean | null>(null);
  const [checkingDisplayName, setCheckingDisplayName] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          loadUserProfile(session.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        console.error('Error loading profile:', error);
        return;
      }
      
      setProfile(data);
      setNewDisplayName(data?.display_name || '');
      setNewEmail(user?.email || '');
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  // Check display name availability with debouncing
  useEffect(() => {
    if (!newDisplayName.trim() || newDisplayName === profile?.display_name) {
      setIsDisplayNameAvailable(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setCheckingDisplayName(true);
      try {
        const { data, error } = await supabase.rpc('check_display_name_available', {
          name: newDisplayName.trim()
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
  }, [newDisplayName, profile?.display_name]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const updateProfile = async () => {
    if (!user || !profile) return;
    
    setLoading(true);
    try {
      // Validate display name
      if (!newDisplayName.trim()) {
        toast({
          title: "Error",
          description: "Display name cannot be empty",
          variant: "destructive",
        });
        return;
      }

      if (newDisplayName !== profile.display_name && isDisplayNameAvailable === false) {
        toast({
          title: "Error",
          description: "Display name is already taken",
          variant: "destructive",
        });
        return;
      }

      // Update display name if changed
      if (newDisplayName !== profile.display_name) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ display_name: newDisplayName.trim() })
          .eq('user_id', user.id);

        if (profileError) throw profileError;
      }

      // Update email if changed
      if (newEmail !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: newEmail
        });

        if (emailError) throw emailError;
        
        toast({
          title: "Email update initiated",
          description: "Please check both your old and new email for confirmation links",
        });
      } else if (newDisplayName !== profile.display_name) {
        toast({
          title: "Profile updated",
          description: "Your display name has been updated successfully",
        });
      }

      // Reload profile
      await loadUserProfile(user.id);
      setIsProfileOpen(false);
      
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
    <nav
      className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50 font-sans"
      style={{ fontFamily: "var(--font-family)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link
            to="/"
            className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent"
            style={{ fontFamily: "var(--font-family)" }}
          >
            Rocket Fantasy
          </Link>
          <div className="flex items-center space-x-4">
            <Link to="/">
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2 hover:scale-105 transition-all duration-200"
                style={{ fontFamily: "var(--font-family)" }}
              >
                <Home className="h-4 w-4" />
                Home
              </Button>
            </Link>
            
            {user ? (
              <>
                <Link to="/fantasy">
                  <Button variant="ghost" size="sm" className="flex items-center gap-2 hover:scale-105 transition-all duration-200">
                    <UserIcon className="h-4 w-4" />
                    Fantasy
                  </Button>
                </Link>
                 <Link to="/leaderboard">
                   <Button variant="ghost" size="sm" className="flex items-center gap-2 hover:scale-105 transition-all duration-200">
                     <UserIcon className="h-4 w-4" />
                      Global League
                   </Button>
                 </Link>
                 
                 <Link to="/profile">
                   <Button variant="ghost" size="sm" className="flex items-center gap-2 hover:scale-105 transition-all duration-200">
                     <Settings className="h-4 w-4" />
                      Profile
                   </Button>
                 </Link>
                 
                 <Button
                   variant="ghost"
                   size="sm"
                   onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                   className="flex items-center gap-2 hover:scale-105 transition-all duration-200"
                 >
                   {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                   {theme === "dark" ? "Light" : "Dark"}
                 </Button>
                 
                 <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="flex items-center gap-2 hover:scale-105 transition-all duration-200">
                        <Settings className="h-4 w-4" />
                        Profile
                      </Button>
                    </DialogTrigger>
                   <DialogContent className="sm:max-w-md">
                     <DialogHeader>
                       <DialogTitle>Profile Settings</DialogTitle>
                       <DialogDescription>
                         Update your profile information
                       </DialogDescription>
                     </DialogHeader>
                     <div className="space-y-4">
                       <div className="space-y-2">
                         <Label htmlFor="current-email">Current Email</Label>
                         <Input
                           id="current-email"
                           value={user?.email || ''}
                           disabled
                           className="bg-muted"
                         />
                         {!user?.email_confirmed_at && (
                           <p className="text-xs text-orange-500">
                             ⚠️ Email not confirmed
                           </p>
                         )}
                       </div>
                       
                       <div className="space-y-2">
                         <Label htmlFor="new-email">New Email</Label>
                         <Input
                           id="new-email"
                           type="email"
                           value={newEmail}
                           onChange={(e) => setNewEmail(e.target.value)}
                           placeholder="Enter new email"
                         />
                         <p className="text-xs text-muted-foreground">
                           Changing email requires confirmation from both old and new addresses
                         </p>
                       </div>

                       <div className="space-y-2">
                         <Label htmlFor="display-name">Display Name</Label>
                         <Input
                           id="display-name"
                           value={newDisplayName}
                           onChange={(e) => setNewDisplayName(e.target.value)}
                           placeholder="Your display name"
                         />
                         {newDisplayName.trim() && newDisplayName !== profile?.display_name && (
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

                       <div className="flex gap-2 pt-4">
                         <Button 
                           onClick={updateProfile} 
                           disabled={loading || (newDisplayName !== profile?.display_name && isDisplayNameAvailable === false)}
                           className="flex-1"
                         >
                           {loading ? "Updating..." : "Update Profile"}
                         </Button>
                         <Button 
                           variant="outline" 
                           onClick={() => {
                             setIsProfileOpen(false);
                             setNewDisplayName(profile?.display_name || '');
                             setNewEmail(user?.email || '');
                           }}
                         >
                           Cancel
                         </Button>
                       </div>
                     </div>
                   </DialogContent>
                 </Dialog>
                  <Button
                   variant="outline" 
                   size="sm" 
                   onClick={handleSignOut}
                   className="flex items-center gap-2 hover:scale-105 transition-all duration-200"
                   style={{ fontFamily: "var(--font-family)" }}
                 >
                  <LogOut className="h-4 w-4" />
                  
                </Button>
              </>
            ) : (
              <Link to="/login">
                <Button variant="outline" size="sm" className="hover:scale-105 transition-all duration-150">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;