import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-background font-roboto">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              RocketLeague Fantasy Pro
            </div>
            <div className="flex space-x-4">
              <Link to="/login">
                <Button variant="outline" className="font-medium">
                  Sign In
                </Button>
              </Link>
              <Link to="/fantasy">
                <Button className="bg-gradient-primary text-primary-foreground font-medium hover:shadow-glow transition-smooth">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Build Your Ultimate
            <span className="block bg-gradient-primary bg-clip-text text-transparent">
              Rocket League Fantasy Team
            </span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Create fantasy teams, make predictions, and compete with friends in the ultimate Rocket League esports experience.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/fantasy">
              <Button 
                size="lg" 
                className="bg-gradient-primary text-primary-foreground font-medium hover:shadow-glow transition-smooth text-lg px-8 py-3"
              >
                Start Building Your Team
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="lg"
              className="font-medium text-lg px-8 py-3"
            >
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-foreground">
            Two Exciting Game Modes
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Fantasy Mode */}
            <Card className="bg-gradient-card border-border shadow-card hover:shadow-glow transition-smooth">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-foreground flex items-center">
                  🏆 Fantasy Mode
                </CardTitle>
                <CardDescription className="text-lg">
                  Build your dream team within budget constraints
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start">
                    <span className="text-primary mr-2">•</span>
                    Select up to 6 players from the Rocket League pro scene
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">•</span>
                    Manage your budget strategically ($12,000 starting budget)
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">•</span>
                    Earn points based on real player performance
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">•</span>
                    Compete in leagues with friends and other users
                  </li>
                </ul>
                <Link to="/fantasy">
                  <Button className="w-full bg-gradient-primary text-primary-foreground font-medium hover:shadow-glow transition-smooth mt-6">
                    Start Fantasy Mode
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Predictions Mode */}
            <Card className="bg-gradient-card border-border shadow-card hover:shadow-glow transition-smooth">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-foreground flex items-center">
                  🔮 Predictions Mode
                </CardTitle>
                <CardDescription className="text-lg">
                  Predict match outcomes and tournament results
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start">
                    <span className="text-primary mr-2">•</span>
                    Predict winners of upcoming matches and tournaments
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">•</span>
                    Earn points for accurate predictions
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">•</span>
                    Special bonus points for upset predictions
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">•</span>
                    Climb the leaderboards with your prediction skills
                  </li>
                </ul>
                <Button 
                  variant="outline" 
                  className="w-full font-medium mt-6"
                  disabled
                >
                  Coming Soon
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-4 py-16 bg-card/20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-12 text-foreground">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto text-2xl font-bold text-primary-foreground">
                1
              </div>
              <h3 className="text-xl font-bold text-foreground">Create Account</h3>
              <p className="text-muted-foreground">
                Sign up for free and get started with your fantasy journey
              </p>
            </div>
            <div className="space-y-4">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto text-2xl font-bold text-primary-foreground">
                2
              </div>
              <h3 className="text-xl font-bold text-foreground">Build Your Team</h3>
              <p className="text-muted-foreground">
                Select players within your budget and create the ultimate roster
              </p>
            </div>
            <div className="space-y-4">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto text-2xl font-bold text-primary-foreground">
                3
              </div>
              <h3 className="text-xl font-bold text-foreground">Compete & Win</h3>
              <p className="text-muted-foreground">
                Earn points based on real performance and climb the leaderboards
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 px-4 py-8">
        <div className="max-w-6xl mx-auto text-center">
          <div className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
            RocketLeague Fantasy Pro
          </div>
          <p className="text-muted-foreground mb-4">
            The ultimate fantasy experience for Rocket League esports
          </p>
          <div className="flex justify-center space-x-6 text-sm text-muted-foreground">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Contact</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
