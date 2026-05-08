import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function App() {
  return (
    <div className="min-h-screen bg-brand-50 p-8">
      <h1>TuneFolio</h1>
      <p className="mt-2 text-brand-400">Lesson management for music teachers</p>
      <div className="mt-6 flex gap-3">
        <Button className="bg-accent-500 hover:bg-accent-600 text-white">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="ghost" className="text-accent-500">Ghost</Button>
      </div>
      <Card className="mt-6 max-w-md border-brand-200">
        <CardHeader>
          <CardTitle>Sample Card</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-brand-400">Card content here</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default App;
