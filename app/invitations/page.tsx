"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import {
  User,
  LogOut,
  Clock,
  Mail,
  Check,
  X,
  Inbox,
  Calendar,
} from "lucide-react";
import LogoTitle from "@/app/components/LogoTitle";

interface Invitation {
  _id: string;
  projectTitle: string;
  ownerEmail: string;
  createdAt: string;
}

export default function InvitationsPage() {
  const [user, setUser] = useState<{ username: string; email: string } | null>(
    null,
  );
  const [showPopup, setShowPopup] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [invitationCount, setInvitationCount] = useState(0);
  const router = useRouter();
  const popupRef = useRef<HTMLDivElement>(null);

  // Fetch logged in user
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    if (!token || !userData) router.push("/");
    else setUser(JSON.parse(userData));
  }, [router]);

  // Fetch invitations
  useEffect(() => {
    if (!user?.email) return;
    fetch(`/api/invitations?userEmail=${encodeURIComponent(user.email)}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setInvitations(data);
          setInvitationCount(data.length);
        }
      })
      .catch((err) => console.error("Error fetching invitations:", err));
  }, [user]);

  // Hide popup if click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        setShowPopup(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  };

  const handleInvitationAction = async (
    invitationId: string,
    action: "accept" | "decline",
  ) => {
    setLoading(true);
    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId, action }),
      });
      if (!res.ok) throw new Error("Failed to update invitation");

      setInvitations((prev) => prev.filter((i) => i._id !== invitationId));
      setInvitationCount((prev) => prev - 1);
    } catch (err) {
      console.error(err);
      alert("Error handling invitation.");
    } finally {
      setLoading(false);
    }
  };

  const getTimeLeft = (createdAt: string) => {
    const created = new Date(createdAt).getTime();
    const expires = created + 3 * 24 * 60 * 60 * 1000; // 3 days expiration
    const diff = expires - Date.now();
    if (diff <= 0) return { text: "Expired", isExpired: true };

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return { text: `${days}d ${hours % 24}h`, isExpired: false };
    }

    return {
      text: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`,
      isExpired: false,
    };
  };

  return (
    <div className="flex min-h-screen font-sans bg-background text-foreground">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-sidebar border-r border-border p-6 flex flex-col">
        <div className="mb-8">
          <LogoTitle />
        </div>

        <nav className="space-y-2 flex-1">
          <Button
            variant="default"
            className="w-full bg-accent/10 justify-start text-lg hover:bg-gray-700 hover:text-accent-foreground transition-all cursor-pointer"
            onClick={() => router.push("/projects")}
          >
            Projects
          </Button>
          <Button
            variant="ghost"
            className="w-full bg-accent/100 justify-between text-lg"
            onClick={() => router.push("/invitations")}
          >
            Invitations
            {invitationCount > 0 && (
              <Badge variant="destructive" className="ml-2 text-lg">
                {invitationCount}
              </Badge>
            )}
          </Button>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col ml-64">
        {/* Topbar */}
        <header className="bg-card border-b border-border shadow-sm p-6 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-serif font-semibold tracking-tight">
              Invitations
            </h2>
            <p className="text-muted-foreground mt-1">
              {invitationCount > 0
                ? `You have ${invitationCount} pending invitation${invitationCount !== 1 ? "s" : ""}`
                : "No pending invitations"}
            </p>
          </div>

          {/* User Icon & Popup */}
          <div className="relative" ref={popupRef}>
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 rounded-full bg-gradient-primary hover:shadow-glow transition"
              onClick={() => setShowPopup((prev) => !prev)}
            >
              {user?.username?.charAt(0)?.toUpperCase() || "U"}
            </Button>
            {showPopup && user && (
              <div className="absolute right-0 mt-2 w-64 bg-popover border border-border rounded-lg shadow-lg p-4 z-50 animate-slide-up">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center">
                    <User className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold">{user.username}</p>
                    <p className="text-sm text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full justify-start text-destructive border-destructive/20 hover:bg-destructive hover:text-destructive-foreground transition"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            )}
          </div>
        </header>

        {/* Invitations */}
        <main className="flex-1 px-6 py-8 bg-gradient-subtle">
          {invitations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-primary/10 flex items-center justify-center mb-6">
                <Inbox className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Invitations</h3>
              <p className="text-muted-foreground max-w-sm">
                When someone invites you to collaborate on a project,
                you&apos;ll see their invitations here.
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-w-4xl mx-auto">
              {invitations.map((invitation) => {
                const timeLeft = getTimeLeft(invitation.createdAt);
                return (
                  <Card
                    key={invitation._id}
                    className="shadow-card bg-accent/07 border-border/50 hover:shadow-primary/50 transition animate-slide-up"
                  >
                    <CardContent className="p-6 flex justify-between items-start">
                      <div className="flex-1 space-y-2">
                        <div>
                          <h3 className="text-lg font-semibold">
                            {invitation.projectTitle}
                          </h3>
                          <p className="text-muted-foreground flex items-center gap-2 mt-1">
                            <Mail className="h-4 w-4" />
                            Invited by {invitation.ownerEmail}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          Received{" "}
                          {new Date(invitation.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 ml-6">
                        <Badge
                          variant={
                            timeLeft.isExpired ? "destructive" : "secondary"
                          }
                          className="flex items-center gap-1"
                        >
                          <Clock className="h-3 w-3" />
                          {timeLeft.text}
                        </Badge>
                        <div className="flex gap-2 mt-2">
                          <Button
                            onClick={() =>
                              handleInvitationAction(invitation._id, "accept")
                            }
                            disabled={loading || timeLeft.isExpired}
                            className="bg-success hover:bg-success/50 text-success-foreground transition"
                          >
                            <Check className="h-4 w-4 mr-2" /> Accept
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() =>
                              handleInvitationAction(invitation._id, "decline")
                            }
                            disabled={loading}
                            className="border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground transition"
                          >
                            <X className="h-4 w-4 mr-2" /> Decline
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
