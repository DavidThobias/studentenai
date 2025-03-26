
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Brain, BookOpen, Trophy } from "lucide-react";

const UserDashboard = () => {
  return (
    <div className="grid gap-4 md:gap-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Studievoortgang
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">70%</div>
            <p className="text-xs text-muted-foreground">
              van het studiemateriaal doorgenomen
            </p>
            <Progress value={70} className="mt-3" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quiz Scores</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">85%</div>
            <p className="text-xs text-muted-foreground">
              gemiddelde score op quizzen
            </p>
            <Progress value={85} className="mt-3" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Leerdoelen
            </CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3/5</div>
            <p className="text-xs text-muted-foreground">
              leerdoelen behaald
            </p>
            <Progress value={60} className="mt-3" />
          </CardContent>
        </Card>
      </div>
      
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Recent Studiemateriaal</CardTitle>
          <CardDescription>
            Bekijk je recent bekeken studiemateriaal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center space-x-3">
                <BookOpen className="h-5 w-5 text-study-600" />
                <div>
                  <p className="font-medium">Basisboek Sales</p>
                  <p className="text-sm text-muted-foreground">Hoofdstuk 3: Verkoopkanalen</p>
                </div>
              </div>
              <span className="text-sm text-muted-foreground">2 dagen geleden</span>
            </div>
            
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center space-x-3">
                <BookOpen className="h-5 w-5 text-study-600" />
                <div>
                  <p className="font-medium">Marketing Fundamentals</p>
                  <p className="text-sm text-muted-foreground">Hoofdstuk 2: Doelgroepanalyse</p>
                </div>
              </div>
              <span className="text-sm text-muted-foreground">5 dagen geleden</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <BookOpen className="h-5 w-5 text-study-600" />
                <div>
                  <p className="font-medium">Economie Basisprincipes</p>
                  <p className="text-sm text-muted-foreground">Hoofdstuk 1: Introductie</p>
                </div>
              </div>
              <span className="text-sm text-muted-foreground">1 week geleden</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserDashboard;
