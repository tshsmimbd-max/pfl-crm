import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Upload, 
  Download, 
  CheckCircle, 
  AlertCircle, 
  Users, 
  DollarSign,
  ShoppingCart,
  Mail
} from "lucide-react";

interface BulkRevenueUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface UploadResult {
  success: number;
  failed: number;
  errors: string[];
  summary: {
    totalRevenue: number;
    totalOrders: number;
    affectedUsers: number;
  };
}

export default function BulkRevenueUpload({ open, onOpenChange }: BulkRevenueUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      return await apiRequest("POST", "/api/daily-revenue/bulk-upload", formData);
    },
    onSuccess: (result: UploadResult) => {
      setUploadResult(result);
      setUploadProgress(100);
      queryClient.invalidateQueries({ queryKey: ["/api/daily-revenue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/metrics"] });
      
      toast({
        title: "Upload Complete",
        description: `Successfully uploaded ${result.success} revenue entries. ${result.failed > 0 ? `${result.failed} entries failed.` : ''}`,
        variant: result.failed > 0 ? "destructive" : "default",
      });
    },
    onError: (error: any) => {
      setIsUploading(false);
      setUploadProgress(0);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload revenue data",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Invalid File",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadResult(null);

    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 200);

    uploadMutation.mutate(file);
  };

  const downloadTemplate = () => {
    const csvContent = [
      "assigned_user,merchant_code,revenue,orders,description",
      "emp323000,MC001,15000,3,Daily revenue for merchant MC001",
      "shm,MC002,25000,5,Revenue from multiple orders",
      "shamimbdt,MC003,8000,2,Small orders revenue"
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "revenue_upload_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const resetUpload = () => {
    setUploadResult(null);
    setUploadProgress(0);
    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Bulk Revenue Upload
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Download */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">CSV Template</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Download the CSV template with required columns:
                  <br />
                  <code className="text-xs bg-muted px-1 rounded">
                    assigned_user, merchant_code, revenue, orders, description
                  </code>
                </div>
                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* File Upload */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="revenue-file">Upload Revenue CSV</Label>
              <Input
                id="revenue-file"
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={handleFileUpload}
                disabled={isUploading}
                className="mt-1"
              />
            </div>

            {/* Progress Bar */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading revenue data...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="w-full" />
              </div>
            )}

            {/* Upload Results */}
            {uploadResult && (
              <div className="space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <div>
                          <div className="text-lg font-semibold text-green-700">
                            {uploadResult.success}
                          </div>
                          <div className="text-sm text-green-600">Successful</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-blue-600" />
                        <div>
                          <div className="text-lg font-semibold text-blue-700">
                            ৳{uploadResult.summary.totalRevenue.toLocaleString()}
                          </div>
                          <div className="text-sm text-blue-600">Total Revenue</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-purple-50 border-purple-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-purple-600" />
                        <div>
                          <div className="text-lg font-semibold text-purple-700">
                            {uploadResult.summary.totalOrders}
                          </div>
                          <div className="text-sm text-purple-600">Total Orders</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Affected Users */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Revenue entries added for {uploadResult.summary.affectedUsers} users
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Email Notification Status */}
                <Alert>
                  <Mail className="w-4 h-4" />
                  <AlertDescription>
                    Summary emails have been sent to all affected users with their daily revenue update.
                  </AlertDescription>
                </Alert>

                {/* Errors */}
                {uploadResult.failed > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>
                      <div className="font-medium mb-2">
                        {uploadResult.failed} entries failed to upload:
                      </div>
                      <ul className="text-sm space-y-1">
                        {uploadResult.errors.map((error, index) => (
                          <li key={index} className="text-xs">• {error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button onClick={resetUpload} variant="outline">
                    Upload Another File
                  </Button>
                  <Button onClick={() => onOpenChange(false)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}