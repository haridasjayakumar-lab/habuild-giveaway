"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "admin";

  useEffect(() => {
    if (session && !isAdmin) {
      router.push("/");
      return;
    }
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then(setUsers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session, isAdmin, router]);

  const toggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "judge" : "admin";
    setUpdating(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (res.ok) {
        const updated = await res.json();
        setUsers(users.map((u) => (u.id === updated.id ? updated : u)));
      }
    } finally {
      setUpdating(null);
    }
  };

  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return <p className="text-muted-foreground font-bold">Loading users...</p>;
  }

  return (
    <div className="relative">
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-black text-slate-800">
          Manage Team
        </h1>
        <p className="text-muted-foreground font-bold mt-1">
          Promote judges to admin or remove admin access. Only visible to admins.
        </p>
      </div>

      <div className="grid gap-3">
        {users.map((user) => {
          const isSelf = user.email === session?.user?.email;
          return (
            <Card
              key={user.id}
              className={`transition-all ${
                user.role === "admin"
                  ? "border-l-4 border-l-indigo-500 bg-indigo-50/30"
                  : "border-l-4 border-l-slate-300"
              }`}
            >
              <CardContent className="py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                      user.role === "admin"
                        ? "bg-gradient-to-br from-indigo-600 to-blue-600"
                        : "bg-gradient-to-br from-slate-500 to-slate-600"
                    }`}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">
                      {user.name}
                      {isSelf && (
                        <span className="text-xs text-muted-foreground ml-2">(you)</span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground font-medium">
                      {user.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    className={
                      user.role === "admin"
                        ? "bg-indigo-100 text-indigo-800 font-bold hover:bg-indigo-100"
                        : "bg-slate-100 text-slate-700 font-bold hover:bg-slate-100"
                    }
                  >
                    {user.role}
                  </Badge>
                  {!isSelf && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="font-bold"
                      disabled={updating === user.id}
                      onClick={() => toggleRole(user.id, user.role)}
                    >
                      {updating === user.id
                        ? "Updating..."
                        : user.role === "admin"
                        ? "Remove Admin"
                        : "Make Admin"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {users.length === 0 && (
        <p className="text-muted-foreground font-bold text-center py-8">
          No users registered yet.
        </p>
      )}
    </div>
  );
}
