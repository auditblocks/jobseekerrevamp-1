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
                <AlertDialogContent className="border-accent/30 border-2 max-w-md bg-card">
                    <AlertDialogHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <BellRing className="h-5 w-5 text-accent" />
                                <AlertDialogTitle className="text-foreground">Notifications</AlertDialogTitle>
                            </div>
                            {unreadCount > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onMarkAllAsRead}
                                    className="text-xs text-accent hover:text-accent/80 hover:bg-accent/10"
                                >
                                    Mark all as read
                                </Button>
                            )}
                        </div>
                        <AlertDialogDescription className="text-muted-foreground">
                            You have {unreadCount} unread {unreadCount === 1 ? "message" : "messages"} from your team members.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="my-3 space-y-2">
                        {notifications.slice(0, showAllNotifications ? notifications.length : 2).map((notification) => (
                            <div
                                key={notification.id}
                                className={cn(
                                    "flex items-center gap-3 p-3 rounded-md transition-all duration-200 cursor-pointer",
                                    notification.read ? "bg-muted" : "bg-accent/10 shadow-sm",
                                )}
                                onClick={() => onMarkAsRead(notification.id)}
                            >
                                <div
                                    className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center font-medium shrink-0",
                                        notification.read
                                            ? "bg-muted-foreground/20 text-muted-foreground"
                                            : "bg-accent/20 text-accent",
                                    )}
                                >
                                    {notification.sender.initials}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p
                                        className={cn(
                                            "text-sm font-medium",
                                            notification.read ? "text-muted-foreground" : "text-foreground",
                                        )}
                                    >
                                        {notification.sender.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">{notification.message}</p>
                                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                                        <Clock className="h-3 w-3 mr-1" />
                                        {notification.time}
                                    </div>
                                </div>
                                {!notification.read && (
                                    <span className="h-2.5 w-2.5 rounded-full bg-accent shrink-0"></span>
                                )}
                            </div>
                        ))}
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            onClick={() => {
                                setShowAllNotifications(false)
                            }}
                            className="border-border text-foreground hover:bg-muted"
                        >
                            Close
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-accent hover:bg-accent/90 text-accent-foreground"
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
                        "fixed top-0 left-0 h-full shadow-lg transition-transform duration-300 ease-in-out transform w-full max-w-md",
                        "bg-card border-r border-border",
                        showAllNotifications ? "translate-x-0" : "-translate-x-full",
                    )}
                >
                    <div className="flex flex-col h-full">
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
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
                                            "flex items-start gap-3 p-4 rounded-lg transition-all duration-200 cursor-pointer",
                                            notification.read
                                                ? "bg-card border border-border"
                                                : "bg-accent/10 border border-accent/20 shadow-sm",
                                        )}
                                        onClick={() => onMarkAsRead(notification.id)}
                                    >
                                        <div
                                            className={cn(
                                                "w-10 h-10 rounded-full flex items-center justify-center font-medium shrink-0",
                                                notification.read
                                                    ? "bg-muted-foreground/20 text-muted-foreground"
                                                    : "bg-accent/20 text-accent",
                                            )}
                                        >
                                            {notification.sender.initials}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <p
                                                    className={cn(
                                                        "text-sm font-medium",
                                                        notification.read ? "text-muted-foreground" : "text-foreground",
                                                    )}
                                                >
                                                    {notification.sender.name}
                                                </p>
                                                <div className="flex items-center text-xs text-muted-foreground">
                                                    <Clock className="h-3 w-3 mr-1" />
                                                    {notification.time}
                                                </div>
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>

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
                        <div className="p-4 border-t border-border">
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

