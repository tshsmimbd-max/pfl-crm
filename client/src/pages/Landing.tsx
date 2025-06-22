import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Layers, BarChart3, Users, Target, Calendar, Zap } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
                <Layers className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Paperfly</h1>
                <p className="text-sm text-gray-500">CRM System</p>
              </div>
            </div>
            <Button onClick={handleLogin} className="bg-primary-600 hover:bg-primary-700">
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl lg:text-6xl">
            Modern CRM for
            <span className="text-primary-600"> Sales Excellence</span>
          </h1>
          <p className="mt-6 text-xl text-gray-600 max-w-3xl mx-auto">
            Streamline your sales process with intelligent lead tracking, pipeline management, 
            and performance analytics designed for modern sales teams.
          </p>
          <div className="mt-10">
            <Button 
              onClick={handleLogin} 
              size="lg"
              className="bg-primary-600 hover:bg-primary-700 text-lg px-8 py-3"
            >
              Get Started
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Lead Management</h3>
              <p className="text-gray-600">
                Track and manage leads through your entire sales pipeline with intelligent automation.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-success-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Sales Analytics</h3>
              <p className="text-gray-600">
                Get insights into your sales performance with comprehensive reporting and analytics.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-warning-100 rounded-lg flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-warning-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Target Management</h3>
              <p className="text-gray-600">
                Set and track sales targets with automated notifications and progress monitoring.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Calendar Integration</h3>
              <p className="text-gray-600">
                Schedule meetings and follow-ups with integrated calendar functionality.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Real-time Collaboration</h3>
              <p className="text-gray-600">
                Collaborate with your team in real-time with instant notifications and updates.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-yellow-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Role-based Access</h3>
              <p className="text-gray-600">
                Secure role-based access control ensures data privacy and appropriate permissions.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center">
          <Card className="border-0 shadow-xl bg-primary-50">
            <CardContent className="pt-12 pb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Ready to Transform Your Sales Process?
              </h2>
              <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                Join modern sales teams who are already using Paperfly CRM to exceed their targets.
              </p>
              <Button 
                onClick={handleLogin} 
                size="lg"
                className="bg-primary-600 hover:bg-primary-700 text-lg px-8 py-3"
              >
                Start Your Journey
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
