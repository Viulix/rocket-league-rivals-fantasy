import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import AdminEventManager from "@/components/AdminEventManager";
import { User } from "@supabase/supabase-js";

const Profile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [displayName, setDisplayName] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if user is admin - for demo purposes, you can replace this with your actual user ID
  // To find your user ID, look at the "User ID" section in your profile
  const isAdmin = user?.id === "your-user-id-here"; // Replace with your actual user ID

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (!session) {
          navigate("/login");
        } else {
          loadProfile(session.user.id);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/login");
      } else {
        loadProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error);
        return;
      }

      if (data) {
        setProfile(data);
        setDisplayName(data.display_name || '');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading events:', error);
        return;
      }

      setEvents(data || []);
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const updateProfile = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: displayName })
        .eq('user_id', user.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update profile.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Profile updated successfully.",
      });

      setIsEditing(false);
      loadProfile(user.id);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile.",
        variant: "destructive",
      });
    }
  };

  

  useEffect(() => {
    if (isAdmin) {
      loadEvents();
    }
  }, [isAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background font-roboto">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "var(--font-family)" }}>
      <Navigation />
      <div className="p-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 text-center animate-fade-in">
            <h1
              className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent"
              style={{ fontFamily: "var(--font-family)" }}
            >
              Profile
            </h1>
            <p className="text-muted-foreground" style={{ fontFamily: "var(--font-family)" }}>
              Manage your account settings and preferences
            </p>
          </div>

          {/* Profile Information */}
          <Card className="bg-gradient-card border-border shadow-card animate-scale-in hover:shadow-glow transition-all duration-300 mb-6">
            <CardHeader>
              <CardTitle className="text-foreground">Profile Information</CardTitle>
              <CardDescription>
                Update your display name and personal information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Display Name
                </label>
                {isEditing ? (
                  <div className="flex gap-2">
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Enter your display name"
                      className="bg-input border-border flex-1"
                    />
                    <Button onClick={updateProfile} size="sm">
                      Save
                    </Button>
                    <Button 
                      onClick={() => {
                        setIsEditing(false);
                        setDisplayName(profile?.display_name || '');
                      }} 
                      variant="outline" 
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="text-foreground">
                      {profile?.display_name || 'Not set'}
                    </span>
                    <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                      Edit
                    </Button>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Email
                </label>
                <div className="p-3 bg-muted rounded-lg">
                  <span className="text-foreground">{user?.email}</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  User ID
                </label>
                <div className="p-3 bg-muted rounded-lg">
                  <span className="text-muted-foreground text-xs font-mono">{user?.id}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Admin Panel */}
          {isAdmin && (
            <Card className="bg-gradient-card border-border shadow-card animate-scale-in hover:shadow-glow transition-all duration-300 mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  Admin Panel
                  <Badge variant="secondary">Admin Only</Badge>
                </CardTitle>
                <CardDescription>
                  Manage events and system administration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AdminEventManager onEventAdded={loadEvents} />
                
                {/* Event Management */}
                {events.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Existing Events</h3>
                    <div className="space-y-3">
                      {events.map((event) => (
                        <div key={event.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <div className="font-medium text-foreground">{event.name}</div>
                            <div className="text-xs text-muted-foreground">
                              Created: {new Date(event.created_at).toLocaleDateString()}
                            </div>
                            {event.starts_at && (
                              <div className="text-xs text-muted-foreground">
                                Starts: {new Date(event.starts_at).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                          <Badge variant="outline">Active</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;