import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  FileText, 
  TrendingUp, 
  Eye, 
  Heart, 
  MessageCircle,
  RefreshCw
} from 'lucide-react';
import Image from 'next/image';

interface NewsManagementHeaderProps {
  onCreateArticle: () => void;
  totalArticles: number;
  publishedArticles: number;
  totalViews: number;
  totalLikes: number;
  loading: boolean;
}

export function NewsManagementHeader({
  onCreateArticle,
  totalArticles,
  publishedArticles,
  totalViews,
  totalLikes,
  loading,
}: NewsManagementHeaderProps) {
  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Left Side */}
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Web3 Recap"
              width={40}
              height={40}
              className="h-10 w-10"
            />
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <FileText className="h-8 w-8" />
                Web3 Recap Management
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage your Web3 news articles and content
              </p>
            </div>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {/* Stats */}
            <div className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                {totalArticles} articles
              </div>
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                {totalViews} total views
              </div>
              <div className="flex items-center gap-1">
                <Heart className="h-4 w-4" />
                {totalLikes} total likes
              </div>
            </div>

            {/* Actions */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <Button onClick={onCreateArticle}>
              <Plus className="h-4 w-4 mr-2" />
              Create Article
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium">Total Articles</span>
            </div>
            <p className="text-2xl font-bold mt-1">{totalArticles}</p>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium">Published</span>
            </div>
            <p className="text-2xl font-bold mt-1">{publishedArticles}</p>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-purple-500" />
              <span className="text-sm font-medium">Total Views</span>
            </div>
            <p className="text-2xl font-bold mt-1">{totalViews}</p>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              <span className="text-sm font-medium">Total Likes</span>
            </div>
            <p className="text-2xl font-bold mt-1">{totalLikes}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

