import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import {
  Code,
  Users,
  GitBranch,
  Zap,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import heroImage from "@/app/assets/hero-collaborative-coding.jpg";
import LogoTitle from "@/app/components/LogoTitle";

const WelcomePage = () => {
  const features = [
    {
      icon: Code,
      title: "Real-time Collaboration",
      description: "Code together with multiple cursors and live editing",
    },
    {
      icon: GitBranch,
      title: "Version Control",
      description: "Built-in git integration for seamless change tracking",
    },
    {
      icon: Zap,
      title: "Syntax Highlighting",
      description: "Support for all major programming languages",
    },
    {
      icon: Users,
      title: "Team Chat",
      description: "Integrated messaging for better collaboration",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden relative">
      {/* Background */}
      <div className="absolute inset-0 bg-flow opacity-20"></div>
      <div className="absolute top-20 left-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float"></div>
      <div
        className="absolute bottom-20 right-20 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-float"
        style={{ animationDelay: "1s" }}
      ></div>

      <div className="relative z-10">
        {/* Header */}
        <header className="px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <LogoTitle />
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button
                variant="ghost"
                className="text-foreground-muted hover:text-foreground hover:bg-accent/30 hover:text-foreground transition-all cursor-pointer"
              >
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-gradient-primary hover:shadow-primary cursor-pointer">
                Get Started
              </Button>
            </Link>
          </div>
        </header>

        {/* Hero Section */}
        <main className="px-6 py-20">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-8 animate-slide-up">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-primary text-sm">
                    <Sparkles className="w-4 h-4" />
                    Now with AI-powered suggestions
                  </div>
                  <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                    Code Together
                    <span className="block bg-gradient-primary bg-clip-text text-transparent text-glow">
                      In Real-time
                    </span>
                  </h1>
                  <p className="text-xl text-foreground-muted max-w-xl">
                    The modern collaborative code editor that brings your team
                    together. Write, review, and ship code faster than ever
                    before.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/signup">
                    <Button
                      size="lg"
                      className="bg-gradient-primary hover:shadow-primary text-lg px-8 py-6 group cursor-pointer"
                    >
                      Start Coding Now
                      <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  <Button
                    size="lg"
                    variant="outline"
                    className="text-lg px-8 py-6 hover:bg-accent/10 hover:text-foreground transition-all cursor-pointer"
                  >
                    Watch Demo
                  </Button>
                </div>

                <div className="flex items-center gap-8 text-sm text-foreground-muted">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-success rounded-full"></div>
                    Free for teams up to 5
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-success rounded-full"></div>
                    No credit card required
                  </div>
                </div>
              </div>

              <div
                className="relative animate-slide-up"
                style={{ animationDelay: "0.3s" }}
              >
                <div className="relative rounded-2xl overflow-hidden shadow-card bg-glow">
                  <Image
                    src={heroImage}
                    alt="Collaborative coding interface"
                    className="w-full h-auto object-cover"
                    placeholder="blur"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-secondary/20"></div>
                </div>

                {/* Floating Element */}
                <div className="absolute -top-4 -right-4 bg-card border border-border rounded-lg p-3 shadow-card animate-float">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                    <span>3 users online</span>
                  </div>
                </div>

                {/* Floating Element */}
                <div
                  className="absolute -bottom-4 -left-4 bg-card border border-border rounded-lg p-3 shadow-card animate-float"
                  style={{ animationDelay: "1.5s" }}
                >
                  <div className="flex items-center gap-2 text-sm">
                    <GitBranch className="w-4 h-4 text-primary" />
                    <span>Auto-saved</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Features Section */}
        <section className="px-6 py-20 bg-background-secondary/50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">
                Everything you need to code together
              </h2>
              <p className="text-foreground-muted text-lg max-w-2xl mx-auto">
                Powerful features designed for modern development teams who want
                to move fast without breaking things.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <Card
                  key={feature.title}
                  className="p-6 bg-card border-border hover:border-primary/50 transition-all duration-300 hover:shadow-primary/20 hover:shadow-lg animate-slide-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-foreground-muted">{feature.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-6 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <div className="bg-gradient-subtle border border-border rounded-2xl p-12 relative overflow-hidden">
              <div className="absolute inset-0 bg-flow opacity-10"></div>
              <div className="relative z-10">
                <h2 className="text-4xl font-bold mb-4">
                  Ready to revolutionize your workflow?
                </h2>
                <p className="text-foreground-muted text-lg mb-8">
                  Join thousands of developers already coding collaboratively
                  with CodeCollab.
                </p>
                <Link href="/login">
                  <Button
                    size="lg"
                    className="bg-gradient-primary hover:shadow-primary text-lg px-8 py-6 group cursor-pointer"
                  >
                    Start Your Free Project
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default WelcomePage;
