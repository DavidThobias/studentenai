
import { useState } from 'react';
import { BarChart, BookOpen, Award, ChevronRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import UserDashboard from '@/components/UserDashboard';

const Learn = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-6">Mijn leerplatform</h1>
      
      <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-md mb-8">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="books" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Studiemateriaal</span>
          </TabsTrigger>
          <TabsTrigger value="achievements" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            <span className="hidden sm:inline">Achievements</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard">
          <UserDashboard />
        </TabsContent>
        
        <TabsContent value="books">
          <Card>
            <CardHeader>
              <CardTitle>Mijn studiemateriaal</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Bekijk hier al je studiemateriaal en voortgang per boek.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="flex justify-between items-center p-4 hover:bg-gray-50 cursor-pointer">
                  <div className="flex items-center">
                    <BookOpen className="h-5 w-5 text-study-600 mr-2" />
                    <div>
                      <p className="font-medium">Bekijk alle boeken</p>
                      <p className="text-sm text-muted-foreground">Toegang tot het complete studiemateriaal</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="achievements">
          <Card>
            <CardHeader>
              <CardTitle>Achievements</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Bekijk hier je behaalde badges en prestaties.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-6 text-center">
                  <Award className="h-16 w-16 mx-auto text-yellow-500 mb-4" />
                  <p className="font-medium">Eerste Quiz</p>
                  <p className="text-sm text-muted-foreground">Maak je eerste quiz</p>
                </Card>
                
                <Card className="p-6 text-center bg-gray-50">
                  <Award className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <p className="font-medium text-gray-500">10 Quizzen Voltooid</p>
                  <p className="text-sm text-gray-400">Voltooi 10 quizzen</p>
                </Card>
                
                <Card className="p-6 text-center bg-gray-50">
                  <Award className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <p className="font-medium text-gray-500">Hoofdstuk Meester</p>
                  <p className="text-sm text-gray-400">Voltooi alle paragrafen van een hoofdstuk</p>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Learn;
