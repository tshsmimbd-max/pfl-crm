import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Upload, FileText, Download, AlertCircle, CheckCircle, X } from "lucide-react";

interface BulkUploadResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: string[];
}

export default function BulkLeadUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<BulkUploadResult | null>(null);
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/leads/bulk-upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      return response.json();
    },
    onSuccess: (result: BulkUploadResult) => {
      setUploadResult(result);
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Upload Complete",
        description: `${result.processed} leads processed successfully`,
      });
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
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
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'text/csv' || droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile);
      } else {
        toast({
          title: "Invalid File",
          description: "Please upload a CSV file",
          variant: "destructive",
        });
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
      } else {
        toast({
          title: "Invalid File",
          description: "Please upload a CSV file",
          variant: "destructive",
        });
      }
    }
  };

  const handleUpload = () => {
    if (!file) return;
    uploadMutation.mutate(file);
  };

  const downloadTemplate = () => {
    const csvContent = `contactName,email,phone,company,value,stage,leadSource,packageSize,website,facebookPageUrl,orderVolume,notes,assignTo
John Doe,john@example.com,+1234567890,Example Corp,50000,prospecting,Social Media,Medium,https://example.com,https://facebook.com/example,100,Initial contact from social media,myself
Jane Smith,jane@example.com,+1987654321,Tech Solutions,75000,qualification,Referral,Large,https://techsolutions.com,https://facebook.com/techsolutions,200,Referred by existing client,admin`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'enhanced-lead-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Upload className="w-4 h-4" />
          Bulk Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Lead Upload</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Template Download */}
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900">Download Template</p>
                <p className="text-sm text-blue-700">Get the CSV template with required columns</p>
              </div>
            </div>
            <Button variant="outline" onClick={downloadTemplate} className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Download
            </Button>
          </div>

          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <Upload className="w-6 h-6 text-gray-600" />
              </div>
              
              {file ? (
                <div className="text-center">
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-600">{Math.round(file.size / 1024)} KB</p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="font-medium text-gray-900">Drop your CSV file here</p>
                  <p className="text-sm text-gray-600">or click to browse</p>
                </div>
              )}
              
              <Label htmlFor="file-upload" className="cursor-pointer">
                <Input
                  id="file-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button variant="outline" className="pointer-events-none">
                  Browse Files
                </Button>
              </Label>
            </div>
          </div>

          {/* CSV Format Info */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Enhanced CSV Format:</strong> Your file should include columns: contactName, email, phone, company, value, stage, leadSource, packageSize, website, facebookPageUrl, orderVolume, notes, assignTo (use user ID, employee name, or "myself")
            </AlertDescription>
          </Alert>

          {/* Upload Progress */}
          {uploadMutation.isPending && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Uploading...</span>
                <span className="text-sm text-gray-600">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          {/* Upload Result */}
          {uploadResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="font-semibold text-green-900">{uploadResult.processed}</p>
                  <p className="text-sm text-green-700">Processed</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <X className="w-8 h-8 text-red-600 mx-auto mb-2" />
                  <p className="font-semibold text-red-900">{uploadResult.failed}</p>
                  <p className="text-sm text-red-700">Failed</p>
                </div>
              </div>
              
              {uploadResult.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-medium">Errors encountered:</p>
                      <ul className="text-sm list-disc list-inside">
                        {uploadResult.errors.slice(0, 5).map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                        {uploadResult.errors.length > 5 && (
                          <li>... and {uploadResult.errors.length - 5} more</li>
                        )}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button
              onClick={handleUpload}
              disabled={!file || uploadMutation.isPending}
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              {uploadMutation.isPending ? 'Uploading...' : 'Upload Leads'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}