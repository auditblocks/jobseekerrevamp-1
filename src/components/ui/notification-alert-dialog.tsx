"use client"

import { BellRing, X, Clock, Check } from "lucide-react"
import { useState } from "react"

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Notification {
    id: string
    sender: {
        name: string
        initials: string
    }
    message: string
    time: string
    read: boolean
}

interface NotificationAlertDialogProps {
    notifications: Notification[]
    onMarkAsRead: (id: string) => void
    onMarkAllAsRead: () => void
    onViewAll?: () => void
    trigger?: React.ReactNode
}

export function NotificationAlertDialog({ 
    notifications, 
    onMarkAsRead, 
    onMarkAllAsRead,
    onViewAll,
    trigger
}: NotificationAlertDialogProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [showAllNotifications, setShowAllNotifications] = useState(false)

    const unreadCount = notifications.filter((notification) => !notification.read).length

    return (
        <>
            <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <AlertDialogTrigger asChild>
                    {trigger || (
                        <Button className="relative pr-6 bg-accent hover:bg-accent/90 text-accent-foreground">
                            <BellRing className="h-5 w-5 mr-1" />
                            Notifications
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                    {unreadCount}
                                </span>
                            )}
                        </Button>
                    )}
                </AlertDialogTrigger>
                <AlertDialogContent
                    className={cn(
                        "border-accent/30 border-2 bg-card",
                        "flex max-h-[min(85vh,calc(100dvh-2rem))] w-[min(100vw-1.5rem,28rem)] max-w-md min-w-0 flex-col gap-0 overflow-hidden p-0 sm:rounded-lg",
                    )}
                >
                    <div className="min-w-0 shrink-0 space-y-2 px-5 pt-5 sm:px-6 sm:pt-6">
                        <AlertDialogHeader className="space-y-2 text-left">
                            <div className="flex min-w-0 items-start justify-between gap-2">
                                <div className="flex min-w-0 items-center gap-2">
                                    <BellRing className="h-5 w-5 shrink-0 text-accent" />
                                    <AlertDialogTitle className="text-foreground">Notifications</AlertDialogTitle>
                                </div>
                                {unreadCount > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={onMarkAllAsRead}
                                        className="shrink-0 text-xs text-accent hover:bg-accent/10 hover:text-accent/80"
                                    >
                                        Mark all as read
                                    </Button>
                                )}
                            </div>
                            <AlertDialogDescription className="text-left text-muted-foreground">
                                You have {unreadCount} unread {unreadCount === 1 ? "message" : "messages"} from your
                                team members.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                    </div>

                    <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-3 sm:px-6">
                        <div className="space-y-2">
                            {notifications.slice(0, showAllNotifications ? notifications.length : 2).map((notification) => (
                                <div
                                    key={notification.id}
                                    className={cn(
                                        "flex min-w-0 max-w-full items-start gap-3 rounded-md p-3 transition-all duration-200 cursor-pointer",
                                        notification.read ? "bg-muted" : "bg-accent/10 shadow-sm",
                                    )}
                                    onClick={() => onMarkAsRead(notification.id)}
                                >
                                    <div
                                        className={cn(
                                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-medium",
                                            notification.read
                                                ? "bg-muted-foreground/20 text-muted-foreground"
                                                : "bg-accent/20 text-accent",
                                        )}
                                    >
                                        {notification.sender.initials}
                                    </div>
                                    <div className="min-w-0 flex-1 overflow-hidden">
                                        <p
                                            className={cn(
                                                "break-words text-sm font-medium",
                                                notification.read ? "text-muted-foreground" : "text-foreground",
                                            )}
                                        >
                                            {notification.sender.name}
                                        </p>
                                        <p className="mt-0.5 break-words text-xs leading-relaxed text-muted-foreground">
                                            {notification.message}
                                        </p>
                                        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                            <Clock className="h-3 w-3 shrink-0" />
                                            <span className="min-w-0 truncate">{notification.time}</span>
                                        </div>
                                    </div>
                                    {!notification.read && (
                                        <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-accent" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <AlertDialogFooter className="shrink-0 gap-2 border-t border-border bg-card px-5 py-4 sm:flex-row sm:justify-end sm:space-x-2 sm:px-6">
                        <AlertDialogCancel
                            onClick={() => {
                                setShowAllNotifications(false)
                            }}
                            className="mt-0 w-full border-border text-foreground hover:bg-muted sm:w-auto"
                        >
                            Close
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="w-full bg-accent text-accent-foreground hover:bg-accent/90 sm:w-auto"
                            onClick={() => {
                                setShowAllNotifications(true)
                                setIsDialogOpen(false)
                                if (onViewAll) {
                                    onViewAll()
                                }
                            }}
                        >
                            View All
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <div
                className={cn(
                    "fixed inset-0 bg-black/50 z-50 transition-opacity duration-300",
                    showAllNotifications ? "opacity-100" : "opacity-0 pointer-events-none",
                )}
            >
                <div
                    className={cn(
                        "fixed top-0 left-0 z-[60] h-full w-full max-w-md min-w-0 overflow-hidden border-r border-border bg-card shadow-lg transition-transform duration-300 ease-in-out",
                        showAllNotifications ? "translate-x-0" : "-translate-x-full",
                    )}
                >
                    <div className="flex h-full min-w-0 flex-col">
                        <div className="p-4 border-b border-border flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <BellRing className="h-5 w-5 text-accent" />
                                <h2 className="text-lg font-semibold text-foreground">All Notifications</h2>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    setShowAllNotifications(false)
                                    document.body.classList.remove("overflow-hidden")
                                }}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-5 w-5" />
                                <span className="sr-only">Close</span>
                            </Button>
                        </div>
                        <div className="min-h-0 min-w-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden p-4">
                            {notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                    <BellRing className="h-12 w-12 mb-2 text-muted-foreground/30" />
                                    <p>No notifications</p>
                                </div>
                            ) : (
                                notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={cn(
                                            "flex min-w-0 max-w-full cursor-pointer items-start gap-3 rounded-lg p-4 transition-all duration-200",
                                            notification.read
                                                ? "border border-border bg-card"
                                                : "border border-accent/20 bg-accent/10 shadow-sm",
                                        )}
                                        onClick={() => onMarkAsRead(notification.id)}
                                    >
                                        <div
                                            className={cn(
                                                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-medium",
                                                notification.read
                                                    ? "bg-muted-foreground/20 text-muted-foreground"
                                                    : "bg-accent/20 text-accent",
                                            )}
                                        >
                                            {notification.sender.initials}
                                        </div>
                                        <div className="min-w-0 flex-1 overflow-hidden">
                                            <div className="flex items-start justify-between gap-2">
                                                <p
                                                    className={cn(
                                                        "min-w-0 flex-1 break-words text-sm font-medium",
                                                        notification.read ? "text-muted-foreground" : "text-foreground",
                                                    )}
                                                >
                                                    {notification.sender.name}
                                                </p>
                                                <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                                                    <Clock className="h-3 w-3" />
                                                    <span className="max-w-[5.5rem] truncate sm:max-w-none">{notification.time}</span>
                                                </div>
                                            </div>
                                            <p className="mt-1 break-words text-sm leading-relaxed text-muted-foreground">
                                                {notification.message}
                                            </p>

                                            {notification.read && (
                                                <div className="flex items-center mt-2 text-xs text-accent">
                                                    <Check className="h-3 w-3 mr-1" />
                                                    Read
                                                </div>
                                            )}
                                        </div>
                                        {!notification.read && (
                                            <span className="h-2.5 w-2.5 rounded-full bg-accent shrink-0 mt-2"></span>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="shrink-0 border-t border-border p-4">
                            <Button
                                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                                onClick={() => {
                                    onMarkAllAsRead()
                                    setShowAllNotifications(false)
                                    document.body.classList.remove("overflow-hidden")
                                }}
                            >
                                Mark All as Read
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

