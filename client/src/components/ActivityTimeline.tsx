import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Mail, Phone, MessageSquare, Calendar, User } from "lucide-react";

interface ActivityTimelineProps {
  leadId: number;
}

export default function ActivityTimeline({ leadId }: ActivityTimelineProps) {
  const { data: activities = [] } = useQuery({
    queryKey: ["/api/activities", leadId],
    enabled: !!leadId,
  });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="w-4 h-4 text-blue-500" />;
      case 'call':
        return <Phone className="w-4 h-4 text-green-500" />;
      case 'meeting':
        return <Calendar className="w-4 h-4 text-purple-500" />;
      case 'note':
        return <MessageSquare className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p>No activity recorded yet</p>
        <p className="text-sm">Start engaging with this lead to see timeline</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity: any, index: number) => (
        <div key={index} className="flex items-start space-x-3 relative">
          {/* Timeline line */}
          {index < activities.length - 1 && (
            <div className="absolute left-4 top-8 w-0.5 h-12 bg-gray-200" />
          )}
          
          {/* Activity icon */}
          <div className="w-8 h-8 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center">
            {getActivityIcon(activity.type)}
          </div>
          
          {/* Activity content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h4 className="font-medium text-gray-900">{activity.title}</h4>
                <Badge variant="outline" className="text-xs">
                  {activity.type}
                </Badge>
              </div>
              <span className="text-sm text-gray-500">
                {formatDate(activity.createdAt)}
              </span>
            </div>
            
            {activity.description && (
              <p className="text-sm text-gray-600 mt-1">
                {activity.description}
              </p>
            )}
            
            {activity.user && (
              <div className="flex items-center space-x-1 mt-2">
                <User className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-500">
                  {activity.user.firstName} {activity.user.lastName}
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}