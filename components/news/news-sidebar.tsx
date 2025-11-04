import { NewsCategory } from '@/lib/news-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Clock, 
  Star, 
  Zap, 
  MessageCircle,
  Heart,
  Eye
} from 'lucide-react';

interface NewsSidebarProps {
  categories: NewsCategory[];
  onCategoryChange: (categoryId: string | null) => void;
  activeCategory: string | null;
}

export function NewsSidebar({ 
  categories, 
  onCategoryChange, 
  activeCategory 
}: NewsSidebarProps) {
  return (
    <div className="space-y-6">
      {/* Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            variant={activeCategory === null ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => onCategoryChange(null)}
          >
            All News
            <Badge variant="secondary" className="ml-auto">
              {categories.reduce((acc, cat) => acc + (cat as any).article_count || 0, 0)}
            </Badge>
          </Button>
          
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={activeCategory === category.id ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => onCategoryChange(category.id)}
            >
              <div 
                className="w-2 h-2 rounded-full mr-3" 
                style={{ backgroundColor: category.color }}
              />
              {category.name}
              <Badge variant="secondary" className="ml-auto">
                {(category as any).article_count || 0}
              </Badge>
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* Quick Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" className="w-full justify-start">
            <Zap className="h-4 w-4 mr-2 text-red-500" />
            Breaking News
            <Badge variant="destructive" className="ml-auto">3</Badge>
          </Button>
          <Button variant="outline" className="w-full justify-start">
            <Star className="h-4 w-4 mr-2 text-yellow-500" />
            Featured
            <Badge variant="secondary" className="ml-auto">12</Badge>
          </Button>
          <Button variant="outline" className="w-full justify-start">
            <TrendingUp className="h-4 w-4 mr-2 text-green-500" />
            Trending
            <Badge variant="secondary" className="ml-auto">8</Badge>
          </Button>
        </CardContent>
      </Card>

      {/* Popular Tags */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Popular Tags</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {['Web3', 'Blockchain', 'DeFi', 'NFT', 'Crypto', 'Recap', 'Bitcoin', 'Ethereum'].map((tag) => (
              <Button
                key={tag}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                {tag}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Newsletter Signup */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
        <CardHeader>
          <CardTitle className="text-lg">Stay Updated</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Get the latest Web3 Recap news delivered to your inbox
          </p>
          <div className="space-y-2">
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
            />
            <Button className="w-full" size="sm">
              Subscribe
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <Eye className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="font-medium">Most viewed today</p>
              <p className="text-muted-foreground">"Web3 Market Analysis"</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <Heart className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="font-medium">Most liked this week</p>
              <p className="text-muted-foreground">"DeFi Trends 2024"</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
              <MessageCircle className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="font-medium">Most discussed</p>
              <p className="text-muted-foreground">"NFT Market Update"</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
