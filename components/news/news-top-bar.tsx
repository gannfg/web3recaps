import { NewsCategory } from '@/lib/news-types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  TrendingUp, 
  Star, 
  Zap,
  Filter,
  Tag
} from 'lucide-react';

interface NewsTopBarProps {
  categories: NewsCategory[];
  onCategoryChange: (categoryId: string | null) => void;
  activeCategory: string | null;
}

export function NewsTopBar({ 
  categories, 
  onCategoryChange, 
  activeCategory 
}: NewsTopBarProps) {
  const selectedCategory = categories.find(cat => cat.id === activeCategory);
  const totalArticles = categories.reduce((acc, cat) => acc + (cat as any).article_count || 0, 0);

  return (
    <div className="w-full bg-card border-b mb-4">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Categories Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select
              value={activeCategory || 'all'}
              onValueChange={(value) => onCategoryChange(value === 'all' ? null : value)}
            >
              <SelectTrigger className="w-48">
                <SelectValue>
                  {selectedCategory ? (
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: selectedCategory.color }}
                      />
                      {selectedCategory.name}
                    </div>
                  ) : (
                    'All News'
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    All News
                    <Badge variant="secondary" className="ml-auto">
                      {totalArticles}
                    </Badge>
                  </div>
                </SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: category.color }}
                      />
                      {category.name}
                      <Badge variant="secondary" className="ml-auto">
                        {(category as any).article_count || 0}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quick Filters Dropdown */}
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <Select defaultValue="all">
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Articles</SelectItem>
                <SelectItem value="breaking">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-red-500" />
                    Breaking News
                    <Badge variant="destructive" className="ml-auto">3</Badge>
                  </div>
                </SelectItem>
                <SelectItem value="featured">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    Featured
                    <Badge variant="secondary" className="ml-auto">12</Badge>
                  </div>
                </SelectItem>
                <SelectItem value="trending">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    Trending
                    <Badge variant="secondary" className="ml-auto">8</Badge>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tags Dropdown */}
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <Select defaultValue="all">
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Tags" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags</SelectItem>
                {['Web3', 'Blockchain', 'DeFi', 'NFT', 'Crypto', 'Recap', 'Bitcoin', 'Ethereum'].map((tag) => (
                  <SelectItem key={tag} value={tag.toLowerCase()}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
