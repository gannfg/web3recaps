'use client';

import { NewsCategory } from '@/lib/news-types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NewsCategoryTabsProps {
  categories: NewsCategory[];
  activeCategory: string | null;
  onCategoryChange: (categoryId: string | null) => void;
}

export function NewsCategoryTabs({ 
  categories, 
  activeCategory, 
  onCategoryChange 
}: NewsCategoryTabsProps) {
  return (
    <div className="mb-8">
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-2 min-w-0">
          <Button
            variant={activeCategory === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => onCategoryChange(null)}
            className="flex-shrink-0"
          >
            All News
            <Badge variant="secondary" className="ml-2">
              {categories.reduce((acc, cat) => acc + (cat as any).article_count || 0, 0)}
            </Badge>
          </Button>
          
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={activeCategory === category.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => onCategoryChange(category.id)}
              className="flex-shrink-0"
              style={{
                borderColor: activeCategory === category.id ? category.color : undefined,
                backgroundColor: activeCategory === category.id ? category.color : undefined,
              }}
            >
              <div 
                className="w-2 h-2 rounded-full mr-2" 
                style={{ backgroundColor: category.color }}
              />
              {category.name}
              <Badge variant="secondary" className="ml-2">
                {(category as any).article_count || 0}
              </Badge>
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
