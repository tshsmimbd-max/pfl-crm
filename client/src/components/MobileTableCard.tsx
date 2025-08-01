import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface MobileTableCardProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileTableCard({ children, className = "" }: MobileTableCardProps) {
  return (
    <Card className={`mb-3 ${className}`}>
      <CardContent className="p-4">
        {children}
      </CardContent>
    </Card>
  );
}

interface MobileFieldProps {
  label: string;
  value: React.ReactNode;
  className?: string;
}

export function MobileField({ label, value, className = "" }: MobileFieldProps) {
  return (
    <div className={`flex justify-between items-center py-1 ${className}`}>
      <span className="text-sm font-medium text-gray-600">{label}:</span>
      <span className="text-sm text-gray-900">{value}</span>
    </div>
  );
}

interface ResponsiveTableProps {
  headers: string[];
  data: any[];
  renderRow: (item: any, index: number) => React.ReactNode;
  renderMobileCard: (item: any, index: number) => React.ReactNode;
  className?: string;
}

export default function ResponsiveTable({
  headers,
  data,
  renderRow,
  renderMobileCard,
  className = ""
}: ResponsiveTableProps) {
  return (
    <>
      {/* Desktop Table */}
      <div className={`hidden lg:block ${className}`}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {headers.map((header, index) => (
                  <th
                    key={index}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((item, index) => renderRow(item, index))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-3">
        {data.map((item, index) => renderMobileCard(item, index))}
      </div>
    </>
  );
}