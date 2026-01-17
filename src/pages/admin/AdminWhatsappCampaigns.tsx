import { useEffect, useState, useCallback, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
    Plus,
    Send,
    Search,
    Loader2,
    Users,
    MessageSquare,
    AlertCircle,
    Upload,
    FileSpreadsheet,
    X,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { CampaignUserSelector } from "@/components/admin/CampaignUserSelector";
import Papa from "papaparse";
import { useDropzone } from "react-dropzone";

interface WhatsappCampaign {
    id: string;
    template_name: string;
    template_language: string;
    status: string;
    total_recipients: number;
    sent_count: number;
    failed_count: number;
    created_at: string;
    completed_at: string | null;
}

interface CSVRecipient {
    name: string;
    phone: string;
}

export default function AdminWhatsappCampaigns() {
    const [campaigns, setCampaigns] = useState<WhatsappCampaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateDialog, setShowCreateDialog] = useState(false);

    // Form state
    const [templateName, setTemplateName] = useState("");
    const [templateLanguage, setTemplateLanguage] = useState("en_US");
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [csvRecipients, setCsvRecipients] = useState<CSVRecipient[]>([]);
    const [campaignSource, setCampaignSource] = useState<"users" | "csv">("users");
    const [isSending, setIsSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        fetchCampaigns();
    }, []);

    const fetchCampaigns = async () => {
        try {
            setLoading(true);
            const { data, error } = await (supabase as any)
                .from("whatsapp_campaigns")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;
            setCampaigns((data as WhatsappCampaign[]) || []);
        } catch (error: any) {
            console.error("Error fetching campaigns:", error);
            toast.error("Failed to fetch campaigns");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCampaign = async () => {
        if (!templateName) {
            toast.error("Please enter a template name");
            return;
        }

        const totalRecipients = campaignSource === "users" ? selectedUsers.length : csvRecipients.length;

        if (totalRecipients === 0) {
            toast.error("Please select at least one recipient");
            return;
        }

        setIsSending(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            // 1. Create campaign record
            const { data: campaign, error: campaignError } = await (supabase as any)
                .from("whatsapp_campaigns")
                .insert({
                    template_name: templateName,
                    template_language: templateLanguage,
                    status: "draft",
                    total_recipients: totalRecipients,
                    created_by: user.id,
                })
                .select()
                .single();

            if (campaignError) throw campaignError;

            // Prepare Payload
            let finalRecipients: any[] = [];

            if (campaignSource === "users") {
                // Fetch details for selected users
                const { data: userDetails } = await supabase
                    .from("profiles")
                    .select("id, phone_number, name")
                    .in("id", selectedUsers) as any;

                if (!userDetails) throw new Error("Could not fetch user details");

                finalRecipients = (userDetails as any[])
                    .filter(u => u.phone_number)
                    .map(u => ({
                        campaign_id: campaign.id,
                        user_id: u.id,
                        phone_number: u.phone_number,
                        recipient_name: u.name,
                        status: 'pending'
                    }));
            } else {
                // Use CSV data
                finalRecipients = csvRecipients.map(r => ({
                    campaign_id: campaign.id,
                    user_id: null, // Guest
                    phone_number: r.phone,
                    recipient_name: r.name,
                    status: 'pending'
                }));
            }

            if (finalRecipients.length === 0) {
                throw new Error("No valid recipients found (missing phone numbers?)");
            }

            // 2. Insert into DB
            const { error: recipientsError } = await (supabase as any)
                .from("whatsapp_campaign_recipients")
                .insert(finalRecipients);

            if (recipientsError) throw recipientsError;

            // 3. Invoke Edge Function
            const { data: sessionData } = await supabase.auth.getSession();

            // Prepare payload for edge function
            // We need to send { user_id, phone_number, name } 

            const edgeFunctionPayload = finalRecipients.map(r => ({
                user_id: r.user_id,
                phone_number: r.phone_number,
                name: r.recipient_name
            }));

            const { error: sendError } = await supabase.functions.invoke("send-whatsapp-campaign", {
                body: {
                    campaign_id: campaign.id,
                    recipients: edgeFunctionPayload,
                    template_name: templateName,
                    template_language: templateLanguage
                },
                headers: {
                    Authorization: `Bearer ${sessionData?.session?.access_token}`,
                },
            });

            if (sendError) throw sendError;

            toast.success("Campaign execution started!");
            setShowCreateDialog(false);
            setTemplateName("");
            setSelectedUsers([]);
            setCsvRecipients([]);
            fetchCampaigns();
        } catch (error: any) {
            console.error("Error creating campaign:", error);
            toast.error(error.message || "Failed to create campaign");
        } finally {
            setIsSending(false);
        }
    };

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const parsedData: CSVRecipient[] = [];
                const errors: string[] = [];

                results.data.forEach((row: any, index: number) => {
                    // Normalize keys to lowercase for flexibility
                    const nameKey = Object.keys(row).find(k => k.toLowerCase().includes('name'));
                    const phoneKey = Object.keys(row).find(k => k.toLowerCase().includes('phone') || k.toLowerCase().includes('mobile') || k.toLowerCase().includes('contact'));

                    if (nameKey && phoneKey) {
                        const name = row[nameKey];
                        const phone = row[phoneKey];
                        if (name && phone) {
                            parsedData.push({ name, phone });
                        }
                    }
                });

                if (parsedData.length === 0) {
                    toast.error("Could not parse valid recipients. Ensure CSV has 'Name' and 'Phone' columns.");
                } else {
                    setCsvRecipients(parsedData);
                    toast.success(`Parsed ${parsedData.length} recipients successfully`);
                }
            },
            error: (error) => {
                toast.error(`CSV Parsing Error: ${error.message}`);
            }
        });
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv'],
            'application/vnd.ms-excel': ['.csv']
        },
        multiple: false
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case "completed":
                return "bg-green-500/10 text-green-500 border-green-500/20";
            case "sending":
                return "bg-blue-500/10 text-blue-500 border-blue-500/20";
            case "failed":
                return "bg-red-500/10 text-red-500 border-red-500/20";
            default:
                return "bg-gray-500/10 text-gray-500 border-gray-500/20";
        }
    };

    const filteredCampaigns = campaigns.filter(c =>
        c.template_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <AdminLayout>
            <Helmet>
                <title>WhatsApp Campaigns | Admin</title>
            </Helmet>

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">WhatsApp Campaigns</h1>
                        <p className="text-muted-foreground">Send bulk WhatsApp messages via Meta Cloud API</p>
                    </div>
                    <Button onClick={() => setShowCreateDialog(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        New Campaign
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>History</CardTitle>
                            <div className="relative w-64">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search templates..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Template</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Recipients</TableHead>
                                    <TableHead>Sent</TableHead>
                                    <TableHead>Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                        </TableCell>
                                    </TableRow>
                                ) : filteredCampaigns.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            No campaigns found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredCampaigns.map((campaign) => (
                                        <TableRow key={campaign.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <MessageSquare className="h-4 w-4 text-green-600" />
                                                    {campaign.template_name}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={getStatusColor(campaign.status)}>
                                                    {campaign.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{campaign.total_recipients}</TableCell>
                                            <TableCell>
                                                {campaign.sent_count} / {campaign.total_recipients}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {format(new Date(campaign.created_at), "MMM d, HH:mm")}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Create WhatsApp Campaign</DialogTitle>
                            <DialogDescription>
                                Send a template message to multiple users.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Template Name</Label>
                                    <Input
                                        placeholder="e.g. hello_world"
                                        value={templateName}
                                        onChange={e => setTemplateName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Language Code</Label>
                                    <Select value={templateLanguage} onValueChange={setTemplateLanguage}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="en_US">English (US)</SelectItem>
                                            <SelectItem value="en_GB">English (UK)</SelectItem>
                                            <SelectItem value="hi_IN">Hindi</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <Tabs value={campaignSource} onValueChange={(v) => setCampaignSource(v as any)} className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="users">Select Users</TabsTrigger>
                                    <TabsTrigger value="csv">Upload CSV</TabsTrigger>
                                </TabsList>
                                <TabsContent value="users" className="space-y-4 pt-4">
                                    <div className="space-y-2">
                                        <Label>Recipients ({selectedUsers.length})</Label>
                                        <div className="border rounded-md p-2 max-h-60 overflow-y-auto">
                                            <CampaignUserSelector
                                                selectedUsers={selectedUsers}
                                                onUsersChange={setSelectedUsers}
                                            />
                                        </div>
                                    </div>
                                </TabsContent>
                                <TabsContent value="csv" className="space-y-4 pt-4">
                                    <div
                                        {...getRootProps()}
                                        className={`
                                            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                                            ${isDragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/25 hover:border-primary/50'}
                                        `}
                                    >
                                        <input {...getInputProps()} />
                                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                            <Upload className="h-8 w-8 mb-2" />
                                            {csvRecipients.length > 0 ? (
                                                <div className="text-primary font-medium">
                                                    <FileSpreadsheet className="h-4 w-4 inline mr-2" />
                                                    {csvRecipients.length} recipients loaded from CSV
                                                </div>
                                            ) : (
                                                <>
                                                    <p className="font-medium">Drag & drop a CSV file here</p>
                                                    <p className="text-xs">Required Columns: Name, Phone</p>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {csvRecipients.length > 0 && (
                                        <div className="border rounded-md max-h-40 overflow-y-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="w-[100px]">#</TableHead>
                                                        <TableHead>Name</TableHead>
                                                        <TableHead className="text-right">Phone</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {csvRecipients.slice(0, 10).map((r, i) => (
                                                        <TableRow key={i}>
                                                            <TableCell className="font-medium">{i + 1}</TableCell>
                                                            <TableCell>{r.name}</TableCell>
                                                            <TableCell className="text-right">{r.phone}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                    {csvRecipients.length > 10 && (
                                                        <TableRow>
                                                            <TableCell colSpan={3} className="text-center text-xs text-muted-foreground">
                                                                ...and {csvRecipients.length - 10} more
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                    <div className="flex justify-end">
                                        <Button variant="ghost" size="sm" onClick={(e) => {
                                            e.stopPropagation();
                                            setCsvRecipients([]);
                                        }}>Clear CSV</Button>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleCreateCampaign} disabled={isSending}>
                                {isSending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send className="h-4 w-4 mr-2" />
                                        Send Campaign
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
}
