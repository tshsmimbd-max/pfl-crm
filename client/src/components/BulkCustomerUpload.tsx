import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Upload, Download, FileText, AlertCircle, CheckCircle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface UploadResult {
  processed: number;
  failed: number;
  errors: string[];
}

export default function BulkCustomerUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('customers', file);
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      try {
        const response = await fetch("/api/customers/bulk-upload", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        
        clearInterval(progressInterval);
        setUploadProgress(100);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Upload failed: ${errorText}`);
        }
        
        return await response.json();
      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      }
    },
    onSuccess: (data: UploadResult) => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setUploadResult(data);
      setFile(null);
      setUploadProgress(0);
      toast({
        title: "Upload Complete",
        description: `Successfully processed ${data.processed} customers. ${data.failed > 0 ? `${data.failed} failed.` : ''}`,
      });
    },
    onError: (error) => {
      setUploadProgress(0);
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
    setUploadResult(null);
    uploadMutation.mutate(file);
  };

  const downloadTemplate = () => {
    const csvContent = `merchantCode,merchantName,rateChart,contactPerson,phoneNumber,assignedAgent,leadId,productType,notes
MC002,TechCorp Solutions,ISD,John Doe,+8801712345678,admin,,Service,Enterprise technology client
MC003,Business Solutions Ltd,Pheripheri,Jane Smith,+8801887654321,emp323000,,Product,Medium-scale business solutions
MC004,StartupXYZ,OSD,Mike Johnson,+8801555123456,shm,,Service,High growth startup potential`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customer-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Upload className="w-4 h-4" />
          Bulk Upload Customers
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Customer Upload</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Template Download */}
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900">Download Customer Template</p>
                <p className="text-sm text-blue-700">Get the CSV template with new customer structure. You can use either user IDs or employee names for assignedAgent field.</p>
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
              
              <Label htmlFor="customer-file-upload" className="cursor-pointer">
                <Input
                  id="customer-file-upload"
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
              <strong>Enhanced Customer CSV Format:</strong> Your file should include columns: contactName, email, phone, company, totalValue, leadSource, packageSize, preferredPickTime, pickupAddress, website, facebookPageUrl, customerType, notes
            </AlertDescription>
          </Alert>

          {/* Upload Progress */}
          {uploadMutation.isPending && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Uploading customers...</span>
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
              {uploadMutation.isPending ? 'Uploading...' : 'Upload Customers'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}