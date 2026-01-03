import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

interface ATSScoreGaugeProps {
  score: number;
  showDetails?: boolean;
  formattingScore?: number;
  keywordScore?: number;
  sectionsScore?: number;
  structureScore?: number;
}

const ATSScoreGauge = ({
  score,
  showDetails = false,
  formattingScore,
  keywordScore,
  sectionsScore,
  structureScore,
}: ATSScoreGaugeProps) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Needs Improvement";
  };

  const getScoreVariant = (score: number): "default" | "secondary" | "destructive" | "outline" => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "destructive";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>ATS Compatibility Score</CardTitle>
          <Badge variant={getScoreVariant(score)}>{getScoreBadge(score)}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className={`text-6xl font-bold ${getScoreColor(score)} mb-2`}>
            {score}
          </div>
          <p className="text-sm text-muted-foreground">out of 100</p>
        </div>

        <Progress value={score} className="h-3" />

        {showDetails && (
          <div className="space-y-3 pt-4 border-t">
            {formattingScore !== undefined && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">Formatting</span>
                  {formattingScore >= 20 ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                  )}
                </div>
                <span className="text-sm font-medium">{formattingScore}/25</span>
              </div>
            )}

            {keywordScore !== undefined && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">Keywords</span>
                  {keywordScore >= 24 ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                  )}
                </div>
                <span className="text-sm font-medium">{keywordScore}/30</span>
              </div>
            )}

            {sectionsScore !== undefined && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">Sections</span>
                  {sectionsScore >= 16 ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                  )}
                </div>
                <span className="text-sm font-medium">{sectionsScore}/20</span>
              </div>
            )}

            {structureScore !== undefined && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">Structure</span>
                  {structureScore >= 12 ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                  )}
                </div>
                <span className="text-sm font-medium">{structureScore}/15</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ATSScoreGauge;

