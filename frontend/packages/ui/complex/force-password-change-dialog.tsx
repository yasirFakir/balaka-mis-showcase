"use client";

import * as React from "react";
import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "../feedback/dialog";
import { Button } from "../base/button";
import { Input } from "../forms/input";
import { PasswordInput } from "../forms/password-input";
import { Label } from "../forms/label";
import { LoadingSpinner } from "../base/loading-spinner";
import { cn } from "../lib/utils";
import { gonia } from "../lib/gonia-theme";
import { ShieldCheck, Lock, AlertTriangle } from "lucide-react";

interface ForcePasswordChangeDialogProps {
  isOpen: boolean;
  onSubmit: (currentPassword: string, newPassword: string) => Promise<void>;
  onSuccess: () => void;
}

export function ForcePasswordChangeDialog({
  isOpen,
  onSubmit,
  onSuccess
}: ForcePasswordChangeDialogProps) {
  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      await onSubmit(currentPassword, newPassword);
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to update password. Please check your current password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent 
        className="sm:max-w-[450px] p-0 overflow-hidden rounded-none border-2 border-primary bg-white shadow-none"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-6 bg-primary/5 border-b border-primary/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary text-white">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black uppercase tracking-tight text-primary">Security Required</DialogTitle>
              <DialogDescription className="text-[10px] font-bold uppercase tracking-normal opacity-60">
                You must establish a new secure password to continue.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 bg-[var(--gonia-canvas)]">
          {error && (
            <div className="p-3 bg-destructive/10 border-2 border-destructive/20 text-destructive text-[11px] font-bold flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className={gonia.text.label}>Temporary Password</Label>
              <PasswordInput
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="The password sent to your email"
                required
                className={gonia.input.base}
              />
            </div>

            <div className="space-y-2">
              <Label className={gonia.text.label}>New Secure Password</Label>
              <PasswordInput
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                required
                className={gonia.input.base}
              />
            </div>

            <div className="space-y-2">
              <Label className={gonia.text.label}>Confirm New Password</Label>
              <PasswordInput
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
                className={gonia.input.base}
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button 
              type="submit" 
              disabled={loading}
              className={cn(
                "w-full h-12 rounded-none font-black uppercase tracking-normal transition-all",
                gonia.button.primary
              )}
            >
              {loading ? <LoadingSpinner size="sm" /> : "Update Credentials"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
