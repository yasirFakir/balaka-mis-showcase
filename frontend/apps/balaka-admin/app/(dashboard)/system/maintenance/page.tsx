"use client";

import { useState } from "react";
import { API_URL } from "@/core/api";
import { useNotifications, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Button, Badge, Input, PasswordInput, Label, Tabs, TabsContent, TabsList, TabsTrigger, AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogMedia, AlertDialogTitle, AlertDialogTrigger } from "@/ui";
import { 
    Database, 
    ShieldAlert, 
    RefreshCcw, 
    Trash2, 
    Download, 
    History,
    AlertTriangle,
    Loader2,
    Upload,
    ArchiveRestore
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

export default function MaintenancePage() {
  const { toast } = useNotifications();
  const { hasPermission, loading: authLoading } = useAuth();
  const [isRestoring, setIsRestoring] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [lastBackup] = useState("2026-01-04 10:15:00");
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [confirmRestoreCheck, setConfirmRestoreCheck] = useState(false);
  
  const [restorePassword, setRestorePassword] = useState("");
  const [resetPassword, setResetPassword] = useState("");

  const handleDownloadBackup = async () => {
    const downloadToast = toast.loading("Preparing database backup...");
    try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_URL}/api/v1/system/backup`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: "Backup failed" }));
            throw new Error(error.detail || "Backup failed");
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        
        const contentDisposition = response.headers.get("Content-Disposition");
        let filename = `balaka_backup_${new Date().toISOString().split('T')[0]}.sql`;
        if (contentDisposition && contentDisposition.includes("filename=")) {
            filename = contentDisposition.split("filename=")[1].replace(/"/g, "");
        }
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast.success("Database backup downloaded", {
            id: downloadToast,
            description: `File: ${filename}`
        });
    } catch (error: any) {
        const message = error instanceof Error ? error.message : "Failed to download backup";
        toast.error(message, {
            id: downloadToast
        });
    }
  };

  const handleRestore = async () => {
    if (!restoreFile) {
        toast.error("No file selected");
        return;
    }

    if (!restorePassword) {
        toast.error("Password required");
        return;
    }

    const restoreToast = toast.loading("Restoring database...");
    setIsRestoring(true);
    
    try {
        const token = localStorage.getItem("token");
        const formData = new FormData();
        formData.append("file", restoreFile);
        formData.append("password", restorePassword);

        const response = await fetch(`${API_URL}/api/v1/system/restore`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: "Restore failed" }));
            throw new Error(error.detail || "Restore failed");
        }

        toast.success("System restored successfully", {
            id: restoreToast
        });
        setRestoreFile(null);
        setConfirmRestoreCheck(false);
        setRestorePassword("");
    } catch (error: any) {
        const message = error instanceof Error ? error.message : "Failed to restore system";
        toast.error(message, {
            id: restoreToast
        });
    } finally {
        setIsRestoring(false);
    }
  };

  const handleFactoryReset = async () => {
    if (resetConfirmText !== "CONFIRM RESET") {
        toast.error("Invalid confirmation");
        return;
    }

    if (!resetPassword) {
        toast.error("Password required");
        return;
    }

    const resetToast = toast.loading("Performing factory reset...");
    setIsResetting(true);
    
    try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_URL}/api/v1/system/reset`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ password: resetPassword })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: "Reset failed" }));
            throw new Error(error.detail || "Reset failed");
        }

        toast.success("System reset successful", {
            id: resetToast
        });
        setResetConfirmText("");
        setResetPassword("");
        
        setTimeout(() => {
            localStorage.removeItem("token");
            window.location.href = "/auth";
        }, 1500);
    } catch (error: any) {
        const message = error instanceof Error ? error.message : "Failed to reset system";
        toast.error(message, {
            id: resetToast
        });
    } finally {
        setIsResetting(false);
    }
  };

  if (authLoading) return null;

  if (!hasPermission("roles.view")) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 border-2 border-dashed border-destructive/20 bg-destructive/5">
            <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
            <h2 className="text-xl font-black uppercase tracking-tighter text-destructive">Restricted Access</h2>
            <p className="text-muted-foreground text-sm max-w-md mt-2">
                You do not have the necessary privileges to access System Maintenance.
            </p>
        </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary uppercase">System Maintenance</h1>
          <p className="text-muted-foreground text-xs uppercase tracking-normal font-black opacity-60">Manage system settings and diagnostics</p>
        </div>
        <Badge variant="outline" className="h-8 px-3 border-2 border-primary/20 bg-primary/5 rounded-none shadow-[2px_2px_0_0_rgba(49,105,78,0.1)]">
            <History className="mr-2 h-4 w-4 text-primary" />
            <span className="font-black tracking-tight uppercase text-[9px]">System Status: Online</span>
        </Badge>
      </div>

      <Tabs defaultValue="system" className="w-full">
        <TabsList className="bg-primary/5 p-1 border-2 border-primary/10 gap-1 mb-8 w-fit">
            <TabsTrigger value="system" className="w-48 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                <Database className="h-4 w-4 mr-2" /> Data Management
            </TabsTrigger>
        </TabsList>

        <TabsContent value="system" className="space-y-10 outline-none">
            <div className="grid gap-6 md:grid-cols-2">
                {/* Backup Card */}
                <Card className="border-2 border-primary/20 shadow-none rounded-none bg-white">
                    <CardHeader className="bg-primary/5 border-b border-primary/10">
                        <div className="flex items-center gap-3">
                            <div className="bg-primary p-2.5 shadow-[3px_3px_0_0_var(--gonia-accent)]">
                                <Database className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-base uppercase font-black tracking-tight">Database Backup</CardTitle>
                                <CardDescription className="text-[9px] uppercase font-bold tracking-normal opacity-60 text-primary">Create a system snapshot</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4 p-6">
                        <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/10">
                            <span className="text-[10px] font-black uppercase tracking-normal text-primary/60">Last Backup</span>
                            <Badge variant="success" className="font-mono text-[11px] h-6 px-3 rounded-none">{lastBackup}</Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-relaxed font-bold uppercase tracking-tighter italic">
                            Generate a standard SQL dump of all system records.
                        </p>
                    </CardContent>
                    <CardFooter className="p-6 pt-0">
                        <Button className="w-full h-12 text-xs font-black uppercase tracking-normal shadow-[4px_4px_0_0_var(--gonia-accent)] hover:shadow-none transition-all" onClick={handleDownloadBackup}>
                            <Download className="mr-2 h-4 w-4" />
                            Download SQL Backup
                        </Button>
                    </CardFooter>
                </Card>

                {/* Restore Card */}
                <Card className={cn("border-2 shadow-none rounded-none transition-colors bg-white", restoreFile ? "border-primary" : "border-primary/20")}>
                    <CardHeader className="bg-primary/5 border-b border-primary/10">
                        <div className="flex items-center gap-3">
                            <div className={cn("p-2.5 transition-colors", restoreFile ? "bg-primary text-white" : "bg-primary/10 text-primary")}>
                                <ArchiveRestore className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-base uppercase font-black tracking-tight">Database Restore</CardTitle>
                                <CardDescription className="text-[9px] uppercase font-bold tracking-normal opacity-60 text-primary">Import data from file</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4 p-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-normal text-primary/60">Select SQL File</label>
                            <Input
                                id="restore-file"
                                type="file"
                                accept=".db,.sqlite,.sql,.dump"
                                className="h-10 file:mr-4 file:h-full file:bg-transparent file:text-primary file:border-2 file:border-primary file:font-black file:uppercase file:text-[9px] file:px-4 hover:file:bg-primary hover:file:text-white transition-all cursor-pointer rounded-none"
                                onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="p-6 pt-0">
                        <AlertDialog onOpenChange={(open) => {
                            if (!open) {
                                setConfirmRestoreCheck(false);
                                setRestorePassword("");
                            }
                        }}>
                            <AlertDialogTrigger asChild>
                                <Button 
                                    variant={restoreFile ? "default" : "outline"} 
                                    className={cn(
                                        "w-full h-12 text-xs font-black uppercase tracking-normal transition-all rounded-none",
                                        restoreFile ? "shadow-[4px_4px_0_0_var(--gonia-accent)] hover:shadow-none" : "opacity-50"
                                    )} 
                                    disabled={!restoreFile || isRestoring}
                                >
                                    <Upload className="mr-2 h-4 w-4" />
                                    {isRestoring ? "RESTORING..." : "Run Restore"}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="border-primary border-4 rounded-none shadow-none">
                                <AlertDialogHeader>
                                    <AlertDialogMedia className="bg-primary/10 border-primary/20 mx-auto">
                                        <AlertTriangle className="h-10 w-10 text-[var(--gonia-warning)]" />
                                    </AlertDialogMedia>
                                    <AlertDialogTitle className="text-xl font-black uppercase tracking-tighter text-center">Confirm Data Overwrite</AlertDialogTitle>
                                    <AlertDialogDescription className="text-xs font-bold uppercase tracking-tight text-center">
                                        This will replace current data with: <span className="text-primary underline">"{restoreFile?.name}"</span>. 
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                
                                <div className="space-y-4 my-2">
                                    <div style={{ display: 'none' }} aria-hidden="true">
                                        <input type="text" name="email" autoComplete="username" tabIndex={-1} />
                                        <input type="password" name="password" autoComplete="current-password" tabIndex={-1} />
                                    </div>

                                    <div className="flex items-start gap-4 p-5 bg-[var(--gonia-warning)]/10 border-2 border-[var(--gonia-warning)]/30">
                                        <input 
                                            type="checkbox" 
                                            id="confirm-restore" 
                                            checked={confirmRestoreCheck}
                                            onChange={(e) => setConfirmRestoreCheck(e.target.checked)}
                                            className="mt-1 h-5 w-5 accent-primary cursor-pointer shrink-0"
                                        />
                                        <label htmlFor="confirm-restore" className="text-[11px] font-black uppercase leading-tight cursor-pointer text-primary">
                                            I understand that current data will be overwritten.
                                        </label>
                                    </div>

                                    <div className="space-y-1.5 px-1">
                                        <Label className="text-[10px] font-black uppercase tracking-normal text-primary">Admin Password</Label>
                                        <PasswordInput 
                                            placeholder="Enter password"
                                            value={restorePassword}
                                            onChange={(e) => setRestorePassword(e.target.value)}
                                            autoComplete="new-password"
                                            name="restore-admin-password"
                                            className="h-11 border-2 border-primary/20 rounded-none focus-visible:ring-primary focus-visible:border-primary font-bold"
                                        />
                                    </div>
                                </div>

                                <AlertDialogFooter className="gap-3">
                                    <AlertDialogCancel onClick={() => { setConfirmRestoreCheck(false); setRestorePassword(""); }} className="h-12 border-2 border-primary/20 font-black uppercase tracking-normal text-[10px] rounded-none">Abort</AlertDialogCancel>
                                    <AlertDialogAction 
                                        onClick={handleRestore} 
                                        className="h-12 bg-primary text-white font-black uppercase tracking-normal text-[10px] rounded-none shadow-[4px_4px_0_0_var(--gonia-accent)] hover:shadow-none"
                                        disabled={!confirmRestoreCheck || !restorePassword}
                                    >
                                        Confirm Restore
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </CardFooter>
                </Card>
            </div>

            <div className="pt-6">
                <div className="flex items-center gap-4 mb-6">
                    <div className="h-[2px] flex-1 bg-destructive/20" />
                    <div className="flex items-center gap-2 px-4 py-1.5 border-2 border-destructive/20 bg-destructive/5 text-destructive font-black text-[10px] uppercase tracking-normal">
                        System Danger Zone
                    </div>
                    <div className="h-[2px] flex-1 bg-destructive/20" />
                </div>

                <Card className="border-4 border-destructive shadow-none bg-destructive/[0.02] rounded-none">
                    <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="flex items-center gap-6">
                            <div className="bg-destructive p-4 shadow-[4px_4px_0_0_var(--gonia-error)/80]">
                                <Trash2 className="h-10 w-10 text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight text-destructive">Factory Reset</h3>
                                <p className="text-xs font-bold uppercase tracking-tight text-muted-foreground max-w-md mt-1 italic">
                                    Clear all operational data and reset system to initial state.
                                </p>
                            </div>
                        </div>
                        
                        <AlertDialog onOpenChange={(open) => {
                            if (!open) {
                                setResetConfirmText("");
                                setResetPassword("");
                            }
                        }}>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="lg" className="h-14 px-8 text-sm font-black uppercase tracking-normal shadow-[6px_6px_0_0_var(--gonia-error)/80] hover:shadow-none transition-all shrink-0 rounded-none" disabled={isResetting}>
                                    <AlertTriangle className="mr-2 h-5 w-5" />
                                    {isResetting ? "RESETTING..." : "Factory Reset"}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="border-destructive border-[6px] rounded-none shadow-none max-w-2xl">
                                <AlertDialogHeader>
                                    <AlertDialogMedia className="bg-destructive/10 border-destructive/20 mx-auto">
                                        <ShieldAlert className="h-12 w-12 text-destructive" />
                                    </AlertDialogMedia>
                                    <AlertDialogTitle className="text-3xl font-black uppercase tracking-tighter text-destructive text-center">CRITICAL RESET</AlertDialogTitle>
                                    <AlertDialogDescription className="text-center font-black uppercase tracking-tight text-muted-foreground text-xs opacity-60">
                                        This will delete all users, requests, and transactions.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                
                                <div className="bg-destructive/5 p-8 border-2 border-destructive/20 my-4 space-y-6">
                                    <div style={{ display: 'none' }} aria-hidden="true">
                                        <input type="text" name="email" autoComplete="username" tabIndex={-1} />
                                        <input type="password" name="password" autoComplete="current-password" tabIndex={-1} />
                                    </div>

                                    <div className="space-y-2 text-center">
                                        <p className="text-xs font-black uppercase tracking-normal text-destructive">Type the phrase below to confirm</p>
                                        <p className="text-lg font-black tracking-[0.3em] bg-destructive text-white py-2 px-4 inline-block">CONFIRM RESET</p>
                                    </div>
                                    <Input 
                                        value={resetConfirmText}
                                        onChange={(e) => setResetConfirmText(e.target.value.toUpperCase())}
                                        placeholder="Type phrase here..."
                                        autoComplete="off"
                                        name="reset-confirm-phrase"
                                        className="h-14 border-4 border-destructive/30 bg-white text-center text-xl font-black uppercase focus-visible:ring-destructive/20 rounded-none" 
                                    />

                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-normal text-destructive text-center block">Admin Password</Label>
                                        <PasswordInput 
                                            value={resetPassword}
                                            onChange={(e) => setResetPassword(e.target.value)}
                                            placeholder="••••••••"
                                            autoComplete="new-password"
                                            name="reset-admin-password"
                                            className="h-14 border-4 border-destructive/30 bg-white text-center text-xl font-bold focus-visible:ring-destructive/20 rounded-none" 
                                        />
                                    </div>
                                </div>

                                <AlertDialogFooter className="sm:flex-col sm:items-stretch gap-3">
                                    <AlertDialogCancel onClick={() => { setResetConfirmText(""); setResetPassword(""); }} className="h-12 border-2 border-primary/20 font-black uppercase tracking-normal text-[10px] rounded-none m-0">Cancel</AlertDialogCancel>
                                    <AlertDialogAction 
                                        onClick={handleFactoryReset} 
                                        className="h-14 bg-destructive text-white font-black uppercase tracking-normal text-[11px] rounded-none shadow-[6px_6px_0_0_var(--gonia-error)/80] hover:shadow-none"
                                        disabled={resetConfirmText.trim() !== "CONFIRM RESET" || !resetPassword}
                                    >
                                        DESTROY ALL DATA
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </CardContent>
                </Card>
            </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}