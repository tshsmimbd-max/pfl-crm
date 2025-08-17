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
  Mail,
  X
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
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      try {
        const response = await fetch("/api/daily-revenue/bulk-upload", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        
        clearInterval(progressInterval);
        setUploadProgress(100);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Upload failed");
        }
        
        return await response.json();
      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      }
    },
    onSuccess: (result: UploadResult) => {
      setUploadResult(result);
      setIsUploading(false);
      setFile(null);
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

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv')) {
      toast({
        title: "Invalid File",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
    setUploadResult(null);
  };

  const startUpload = () => {
    if (!file) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    uploadMutation.mutate(file);
  };

  const downloadTemplate = () => {
    const csvContent = [
      "assignedUser,merchantCode,date,revenue,orders,description",
      "admin,C158756,2025-01-17,15000,3,Daily revenue entry",
      "admin,C158757,2025-01-17,25000,5,Revenue from multiple orders",
      "admin,C158758,2025-01-17,8000,2,Small orders revenue"
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
    setFile(null);
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
                    assignedUser, merchantCode, date, revenue, orders, description
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
              <Label>Upload Revenue CSV</Label>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                  dragActive 
                    ? "border-primary bg-primary/5" 
                    : file 
                    ? "border-green-300 bg-green-50" 
                    : "border-gray-300 hover:border-gray-400"
                } ${isUploading ? "opacity-50 cursor-not-allowed" : ""}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => !isUploading && fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-2">
                  {file ? (
                    <>
                      <CheckCircle className="w-8 h-8 text-green-500" />
                      <div className="text-sm font-medium text-green-700">
                        {file.name}
                      </div>
                      <div className="text-xs text-green-600">
                        Ready to upload
                      </div>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-gray-400" />
                      <div className="text-sm font-medium">
                        Drop your CSV file here, or click to browse
                      </div>
                      <div className="text-xs text-muted-foreground">
                        CSV files only
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {file && !isUploading && !uploadResult && (
              <div className="flex gap-2">
                <Button onClick={startUpload} className="flex-1">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Revenue Data
                </Button>
                <Button variant="outline" onClick={() => setFile(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

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