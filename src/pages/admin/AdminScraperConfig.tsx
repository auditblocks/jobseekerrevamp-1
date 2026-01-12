import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Globe,
  Play,
  RefreshCw,
  Settings2,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Search
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface ScraperConfig {
  id: string;
  platform: string;
  is_enabled: boolean;
  auto_scrape_enabled: boolean;
  target_countries: string[];
  search_queries: string[];
  quota_per_day: number;
  rate_limit_per_minute: number;
  last_run_at: string | null;
  last_success_at: string | null;
  last_scrape_count: number;
}

interface ScrapingLog {
  id: string;
  platform: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  records_found: number;
  records_added: number;
  records_skipped: number;
  errors: string[] | null;
  metadata?: {
    scraped_recruiters?: Array<{
      name: string;
      email: string;
      company: string | null;
      domain: string | null;
      tier: string;
      quality_score: number;
      source_url: string | null;
      source_platform?: string;
      added: boolean;
    }>;
    countries?: string[];
    queries?: string[];
    max_results?: number;
  };
}

const COUNTRY_OPTIONS = [
  { code: 'IN', name: 'India' },
  { code: 'US', name: 'United States' },
  { code: 'UK', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'SG', name: 'Singapore' },
  { code: 'AE', name: 'UAE' },
];

export default function AdminScraperConfig() {
  const [configs, setConfigs] = useState<ScraperConfig[]>([]);
  const [logs, setLogs] = useState<ScrapingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [newQuery, setNewQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedLog, setSelectedLog] = useState<ScrapingLog | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [configsRes, logsRes] = await Promise.all([
        supabase.from('scraper_config').select('*').order('created_at'),
        supabase.from('scraping_logs').select('*').order('created_at', { ascending: false }).limit(20),
      ]);

      if (configsRes.error) throw configsRes.error;
      if (logsRes.error) throw logsRes.error;

      // If no config exists, create a default one
      if (!configsRes.data || configsRes.data.length === 0) {
        const { data: newConfig, error } = await supabase
          .from('scraper_config')
          .insert({
            platform: 'firecrawl',
            is_enabled: true,
            auto_scrape_enabled: false,
            target_countries: ['IN', 'US'],
            search_queries: [],
            quota_per_day: 50,
            rate_limit_per_minute: 10,
          })
          .select()
          .single();

        if (!error && newConfig) {
          setConfigs([newConfig as unknown as ScraperConfig]);
        }
      } else {
        setConfigs(configsRes.data as unknown as ScraperConfig[]);
      }

      setLogs((logsRes.data || []) as ScrapingLog[]);
    } catch (error: any) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load scraper configuration');
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (id: string, updates: Partial<ScraperConfig>) => {
    try {
      const { error } = await supabase
        .from('scraper_config')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      toast.success('Configuration updated');
      fetchData();
    } catch (error: any) {
      toast.error('Failed to update configuration');
    }
  };

  const addCountry = (configId: string, currentCountries: string[]) => {
    if (!selectedCountry || currentCountries.includes(selectedCountry)) {
      toast.error('Country already added or not selected');
      return;
    }
    updateConfig(configId, { target_countries: [...currentCountries, selectedCountry] });
    setSelectedCountry("");
  };

  const removeCountry = (configId: string, currentCountries: string[], countryToRemove: string) => {
    updateConfig(configId, {
      target_countries: currentCountries.filter(c => c !== countryToRemove)
    });
  };

  const addSearchQuery = (configId: string, currentQueries: string[]) => {
    if (!newQuery.trim()) return;
    if (currentQueries.includes(newQuery.trim())) {
      toast.error('Query already exists');
      return;
    }
    updateConfig(configId, { search_queries: [...currentQueries, newQuery.trim()] });
    setNewQuery("");
  };

  const removeSearchQuery = (configId: string, currentQueries: string[], queryToRemove: string) => {
    updateConfig(configId, {
      search_queries: currentQueries.filter(q => q !== queryToRemove)
    });
  };

  const runManualScrape = async (config: ScraperConfig) => {
    setScraping(true);
    try {
      const response = await supabase.functions.invoke('scrape-recruiters', {
        body: {
          countries: config.target_countries,
          queries: config.search_queries,
          max_results: config.quota_per_day,
          config_id: config.id,
        },
      });

      if (response.error) throw response.error;

      const result = response.data;
      if (result.success) {
        toast.success(result.message);
        fetchData();
      } else {
        toast.error(result.error || 'Scraping failed');
      }
    } catch (error: any) {
      console.error('Scraping error:', error);
      toast.error(error.message || 'Failed to run scraper');
    } finally {
      setScraping(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'running':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20"><RefreshCw className="h-3 w-3 mr-1 animate-spin" />Running</Badge>;
      case 'partial':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"><Clock className="h-3 w-3 mr-1" />Partial</Badge>;
      default:
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
    }
  };

  return (
    <AdminLayout>
      <Helmet>
        <title>Recruiter Scraper | Admin</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Globe className="h-8 w-8" />
              Recruiter Scraper
            </h1>
            <p className="text-muted-foreground">
              Automatically fetch recruiters from the web using Firecrawl
            </p>
          </div>
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <Tabs defaultValue="config" className="space-y-4">
          <TabsList>
            <TabsTrigger value="config">
              <Settings2 className="h-4 w-4 mr-2" />
              Configuration
            </TabsTrigger>
            <TabsTrigger value="logs">
              <Clock className="h-4 w-4 mr-2" />
              Scraping Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              configs.map((config) => (
                <Card key={config.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Search className="h-5 w-5" />
                          Firecrawl Scraper
                        </CardTitle>
                        <CardDescription>
                          Web scraping configuration for automatic recruiter discovery
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="enabled">Enabled</Label>
                          <Switch
                            id="enabled"
                            checked={config.is_enabled}
                            onCheckedChange={(checked) => updateConfig(config.id, { is_enabled: checked })}
                          />
                        </div>
                        <Button
                          onClick={() => runManualScrape(config)}
                          disabled={scraping || !config.is_enabled}
                        >
                          {scraping ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Scraping...
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              Run Now
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Auto-scrape toggle */}
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div>
                        <Label className="text-base font-medium">Daily Auto-Scrape</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically run scraper every day at midnight UTC
                        </p>
                      </div>
                      <Switch
                        checked={config.auto_scrape_enabled}
                        onCheckedChange={(checked) => updateConfig(config.id, { auto_scrape_enabled: checked })}
                      />
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">Last Run</p>
                        <p className="font-medium">
                          {config.last_run_at
                            ? format(new Date(config.last_run_at), 'MMM d, HH:mm')
                            : 'Never'}
                        </p>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">Last Success</p>
                        <p className="font-medium">
                          {config.last_success_at
                            ? format(new Date(config.last_success_at), 'MMM d, HH:mm')
                            : 'Never'}
                        </p>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">Last Scrape Count</p>
                        <p className="font-medium">{config.last_scrape_count || 0}</p>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">Daily Limit</p>
                        <p className="font-medium">{config.quota_per_day}</p>
                      </div>
                    </div>

                    {/* Target Countries */}
                    <div className="space-y-3">
                      <Label className="text-base font-medium">Target Countries</Label>
                      <div className="flex flex-wrap gap-2">
                        {(config.target_countries || []).map((code) => {
                          const country = COUNTRY_OPTIONS.find(c => c.code === code);
                          return (
                            <Badge key={code} variant="secondary" className="gap-1 pr-1">
                              {country?.name || code}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 ml-1 hover:bg-destructive/20"
                                onClick={() => removeCountry(config.id, config.target_countries || [], code)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </Badge>
                          );
                        })}
                      </div>
                      <div className="flex gap-2">
                        <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Add country..." />
                          </SelectTrigger>
                          <SelectContent>
                            {COUNTRY_OPTIONS.filter(c => !config.target_countries?.includes(c.code)).map((country) => (
                              <SelectItem key={country.code} value={country.code}>
                                {country.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => addCountry(config.id, config.target_countries || [])}
                          disabled={!selectedCountry}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Custom Search Queries */}
                    <div className="space-y-3">
                      <Label className="text-base font-medium">Custom Search Queries</Label>
                      <p className="text-sm text-muted-foreground">
                        Add specific search queries to find recruiters (e.g., "fintech recruiter Mumbai", "AI startup HR manager")
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {(config.search_queries || []).map((query, idx) => (
                          <Badge key={idx} variant="outline" className="gap-1 pr-1">
                            {query}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-4 w-4 ml-1 hover:bg-destructive/20"
                              onClick={() => removeSearchQuery(config.id, config.search_queries || [], query)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={newQuery}
                          onChange={(e) => setNewQuery(e.target.value)}
                          placeholder="e.g., tech recruiter Bangalore"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              addSearchQuery(config.id, config.search_queries || []);
                            }
                          }}
                        />
                        <Button
                          variant="outline"
                          onClick={() => addSearchQuery(config.id, config.search_queries || [])}
                          disabled={!newQuery.trim()}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add
                        </Button>
                      </div>
                    </div>

                    {/* Daily Limit */}
                    <div className="space-y-3">
                      <Label className="text-base font-medium">Daily Recruiter Limit</Label>
                      <Input
                        type="number"
                        value={config.quota_per_day}
                        onChange={(e) => updateConfig(config.id, { quota_per_day: parseInt(e.target.value) || 50 })}
                        className="w-[200px]"
                        min={10}
                        max={500}
                      />
                      <p className="text-sm text-muted-foreground">
                        Maximum number of recruiters to add per scrape run
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>Scraping History</CardTitle>
                <CardDescription>Recent scraping job results</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Started</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Found</TableHead>
                      <TableHead>Added</TableHead>
                      <TableHead>Skipped</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No scraping logs yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            {log.started_at ? format(new Date(log.started_at), 'MMM d, HH:mm') : '-'}
                          </TableCell>
                          <TableCell>{getStatusBadge(log.status)}</TableCell>
                          <TableCell>{log.records_found || 0}</TableCell>
                          <TableCell className="text-green-600">{log.records_added || 0}</TableCell>
                          <TableCell className="text-muted-foreground">{log.records_skipped || 0}</TableCell>
                          <TableCell>
                            {log.started_at && log.completed_at
                              ? `${Math.round((new Date(log.completed_at).getTime() - new Date(log.started_at).getTime()) / 1000)}s`
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {log.metadata?.scraped_recruiters && log.metadata.scraped_recruiters.length > 0 ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedLog(log);
                                  setReportDialogOpen(true);
                                }}
                              >
                                View Report
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-sm">No data</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Detailed Report Dialog */}
        <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Scraping Report</DialogTitle>
              <DialogDescription>
                Detailed view of scraped recruiters from {selectedLog?.started_at
                  ? format(new Date(selectedLog.started_at), 'MMM d, yyyy HH:mm')
                  : 'this scraping job'}
              </DialogDescription>
            </DialogHeader>

            {selectedLog?.metadata?.scraped_recruiters ? (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Found</p>
                    <p className="text-2xl font-bold">{selectedLog.records_found || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Added</p>
                    <p className="text-2xl font-bold text-green-600">{selectedLog.records_added || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Skipped</p>
                    <p className="text-2xl font-bold text-muted-foreground">{selectedLog.records_skipped || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Countries</p>
                    <p className="text-sm font-medium">
                      {selectedLog.metadata.countries?.join(", ") || "N/A"}
                    </p>
                  </div>
                </div>

                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Domain</TableHead>
                        <TableHead>Tier</TableHead>
                        <TableHead>Quality Score</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Source</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedLog.metadata.scraped_recruiters.map((recruiter, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{recruiter.name}</TableCell>
                          <TableCell>{recruiter.email}</TableCell>
                          <TableCell>{recruiter.company || "-"}</TableCell>
                          <TableCell>{recruiter.domain || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={recruiter.tier === "PRO_MAX" ? "default" : recruiter.tier === "PRO" ? "secondary" : "outline"}>
                              {recruiter.tier}
                            </Badge>
                          </TableCell>
                          <TableCell>{recruiter.quality_score}</TableCell>
                          <TableCell>
                            {recruiter.added ? (
                              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                                Added
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                                Skipped
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {recruiter.source_platform && (
                                <Badge variant="secondary" className="text-xs w-fit">
                                  {recruiter.source_platform.includes('gemini') ? 'AI Extracted' : 'Regex'}
                                </Badge>
                              )}
                              {recruiter.source_url ? (
                                <a
                                  href={recruiter.source_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-accent hover:underline text-sm truncate max-w-[200px] block"
                                >
                                  {recruiter.source_url}
                                </a>
                              ) : (
                                "-"
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No detailed data available for this scraping job
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

