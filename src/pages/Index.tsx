import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Layout } from "@/components/Layout";
import Stats from "@/components/Dashboard/Stats";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CircularGauge } from "@/components/ui/CircularGauge";
import { BarChart, Package, ShoppingCart, UtensilsCrossed } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { ingredientsApi, recipesApi, productionApi } from "@/lib/api";
import { Ingredient, Recipe } from "@/lib/data";

interface Production {
  _id: string;
  date: string;
  recipeId: string;
  quantity: number;
  notes?: string;
  supervisor: string;
}

const Index = () => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [productionLogs, setProductionLogs] = useState<Production[]>([]);

  const { user } = useAuth();
  const navigate = useNavigate();

  // redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ingData, recData, prodData] = await Promise.all([
          ingredientsApi.getAll(),
          recipesApi.getAll(),
          productionApi.getAll(),
        ]);

        // make sure these are arrays
        if (!Array.isArray(ingData)) {
          console.error("Ingredients response is not an array:", ingData);
          setIngredients([]); // fallback
        } else {
          setIngredients(ingData);
        }

        if (!Array.isArray(recData)) {
          console.error("Recipes response is not an array:", recData);
          setRecipes([]); // fallback
        } else {
          setRecipes(recData);
        }

        if (!Array.isArray(prodData)) {
          console.error("Production logs response is not an array:", prodData);
          setProductionLogs([]); // fallback
        } else {
          setProductionLogs(prodData);
        }
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      }
    };

    fetchData();
  }, []);

  const lowStockIngredients = Array.isArray(ingredients)
    ? ingredients
        .filter((ingredient) => ingredient.stock < ingredient.threshold)
        .sort((a, b) => a.stock / a.threshold - b.stock / b.threshold)
        .slice(0, 3)
    : [];

  const recipeProductionData = recipes
    .map((recipe) => {
      // Get all production logs for this recipe
      const recipeProduction = productionLogs
        .filter((log) => log.recipeId === recipe._id)
        .reduce((sum, log) => sum + log.quantity, 0);

      return {
        name: recipe.name,
        production: recipeProduction,
      };
    })
    .filter((data) => data.production > 0); // Only show recipes with production

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your production inventory.
          </p>
        </div>

        <Stats />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 hover-scale">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart size={18} className="text-primary" />
                Production Overview
              </CardTitle>
              <CardDescription>Total production by flavor</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                {recipeProductionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart
                      data={recipeProductionData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#f0f0f0"
                      />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "none",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                        }}
                      />
                      <Bar
                        dataKey="production"
                        name="Units Produced"
                        fill="#3984A3"
                        radius={[4, 4, 0, 0]}
                      />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    No production data yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="hover-scale">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package size={18} className="text-orange-500" />
                Low Stock Alert
              </CardTitle>
              <CardDescription>Items that need restocking soon</CardDescription>
            </CardHeader>
            <CardContent>
              {lowStockIngredients.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  No ingredients below threshold
                </div>
              ) : (
                <div className="space-y-4">
                  {lowStockIngredients.map((ingredient) => (
                    <div
                      key={ingredient._id}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium">{ingredient.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {ingredient.stock} / {ingredient.threshold}{" "}
                          {ingredient.unit}
                        </p>
                      </div>
                      <CircularGauge
                        value={ingredient.stock}
                        maxValue={ingredient.threshold}
                        size={60}
                        thickness={6}
                      />
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4">
                <Link to="/inventory">
                  <Button variant="outline" className="w-full">
                    View All Ingredients
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="hover-scale">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UtensilsCrossed size={18} className="text-emerald-500" />
                Recipe Management
              </CardTitle>
              <CardDescription>Quick access to recipes</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/recipes">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {recipes.slice(0, 3).map((recipe) => (
                    <div
                      key={recipe._id}
                      className="p-3 rounded-lg border bg-muted/50 hover:bg-muted transition-colors flex flex-col gap-1"
                    >
                      <p className="font-medium text-sm">{recipe.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {recipe.ingredients.length} ingredients
                      </p>
                    </div>
                  ))}
                </div>
              </Link>
              <Separator className="my-4" />
              <Link to="/recipes">
                <Button variant="outline" className="w-full">
                  Manage Recipes
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover-scale">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShoppingCart size={18} className="text-blue-500" />
                Ordering
              </CardTitle>
              <CardDescription>
                Order ingredients from suppliers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Recommended Orders</p>
                  <div className="p-3 rounded-lg border bg-muted/50">
                    <p className="font-medium text-sm">Weekly Order Bundle</p>
                    <p className="text-xs text-muted-foreground mb-2">
                      5 ingredients from preferred suppliers
                    </p>
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-semibold">$345.00</p>
                      <Button variant="secondary" size="sm">
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
                <Separator />
                <Link to="/ordering">
                  <Button variant="outline" className="w-full">
                    Go to Ordering
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Index;
