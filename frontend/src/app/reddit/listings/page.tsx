'use client';

import { useState, useEffect } from 'react';

// Types for Reddit posts
interface RedditPost {
  id: string;
  title: string;
  author: string;
  subreddit: string;
  score: number;
  upvote_ratio: number;
  num_comments: number;
  created_utc: string;
  url: string;
  post_url: string;
  is_video: boolean;
  is_self: boolean;
  selftext: string;
  flair?: string;
  nsfw: boolean;
  spoiler: boolean;
  awards: number;
  permalink: string;
  domain?: string;
  stickied: boolean;
  controversy_level?: string;
}

interface ControversialApiResponse {
  success: boolean;
  count: number;
  subreddit: string;
  time_filter: string;
  min_score: number;
  posts: RedditPost[];
  viral_metrics?: {
    total_score: number;
    average_score: number;
    highest_score: number;
    total_comments: number;
    controversy_stats: {
      highly_controversial: number;
      very_controversial: number;
      controversial: number;
    };
  };
}

// Modern Button Component
const BrutalButton = ({ 
  children, 
  onClick, 
  variant = 'primary',
  disabled = false 
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}) => {
  const baseClasses = "px-8 py-4 border-4 border-black font-bold text-lg transition-all duration-200 cursor-pointer select-none rounded-lg font-space-grotesk";
  const shadowClasses = "shadow-[4px_4px_0px_0px_#000] hover:shadow-[6px_6px_0px_0px_#000] active:shadow-[2px_2px_0px_0px_#000] active:translate-x-1 active:translate-y-1";
  
  const variantClasses = {
    primary: "bg-[#FF006E] text-white hover:bg-[#E6005C]",
    secondary: "bg-[#8AC926] text-black hover:bg-[#7AB51D]", 
    danger: "bg-[#FFBE0B] text-black hover:bg-[#E6AA0A]"
  };

  const disabledClasses = disabled 
    ? "opacity-50 cursor-not-allowed shadow-[2px_2px_0px_0px_#000]" 
    : shadowClasses;

  return (
    <button
      onClick={disabled ? undefined : onClick}
      className={`${baseClasses} ${variantClasses[variant]} ${disabledClasses}`}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

// Modern Card Component
const BrutalCard = ({ 
  children, 
  className = "",
  bgColor = "bg-white"
}: {
  children: React.ReactNode;
  className?: string;
  bgColor?: string;
}) => {
  return (
    <div className={`${bgColor} border-4 border-black shadow-[6px_6px_0px_0px_#000] p-8 rounded-2xl font-space-grotesk ${className}`}>
      {children}
    </div>
  );
};

// Controversy Level Badge
const ControversyBadge = ({ level }: { level?: string }) => {
  if (!level || level === 'normal') return null;

  const badges = {
    highly_controversial: { text: '⚡⚡⚡ HIGHLY CONTROVERSIAL', color: 'bg-[#FF006E]' },
    very_controversial: { text: '⚡⚡ VERY CONTROVERSIAL', color: 'bg-[#FFBE0B]' },
    controversial: { text: '⚡ CONTROVERSIAL', color: 'bg-[#8AC926]' }
  };

  const badge = badges[level as keyof typeof badges];
  if (!badge) return null;

  return (
    <span className={`${badge.color} text-black px-4 py-2 border-2 border-black text-sm font-bold rounded-lg font-space-grotesk`}>
      {badge.text}
    </span>
  );
};

// Reddit Post Component
const RedditPostCard = ({ post }: { post: RedditPost }) => {
  const postAge = Math.floor((Date.now() - new Date(post.created_utc).getTime()) / (1000 * 60 * 60));
  
  return (
    <BrutalCard className="mb-8" bgColor="bg-[#F8F9FA]">
      <div className="space-y-6">
        {/* Post Title */}
        <h2 className="text-3xl font-bold text-black leading-tight font-unbounded">
          {post.title}
        </h2>
        
        {/* Controversy Badge */}
        <div className="flex flex-wrap gap-3">
          <ControversyBadge level={post.controversy_level} />
          {post.nsfw && (
            <span className="bg-[#FF006E] text-white px-4 py-2 border-2 border-black text-sm font-bold rounded-lg font-space-grotesk">
              🔞 NSFW
            </span>
          )}
          {post.spoiler && (
            <span className="bg-[#3A86FF] text-white px-4 py-2 border-2 border-black text-sm font-bold rounded-lg font-space-grotesk">
              ⚠️ SPOILER
            </span>
          )}
          {post.flair && (
            <span className="bg-[#8AC926] text-black px-4 py-2 border-2 border-black text-sm font-bold rounded-lg font-space-grotesk">
              🏷️ {post.flair}
            </span>
          )}
        </div>

        {/* Post Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-lg font-bold">
          <div className="space-y-2">
            <p className="text-black">
              👤 <span className="text-[#FF006E]">u/{post.author}</span> in{' '}
              <span className="text-[#3A86FF]">r/{post.subreddit}</span>
            </p>
            <p className="text-black">
              ⬆️ <span className="text-[#8AC926]">{post.score.toLocaleString()}</span> points |{' '}
              💬 <span className="text-[#FFBE0B]">{post.num_comments.toLocaleString()}</span> comments
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-black">
              📊 <span className="text-[#FF006E]">{(post.upvote_ratio * 100).toFixed(1)}%</span> upvoted
            </p>
            <p className="text-black">
              ⏰ <span className="text-[#3A86FF]">{postAge}</span> hours ago
            </p>
          </div>
        </div>

        {/* Post Content Preview */}
        {post.is_self && post.selftext && (
          <div className="bg-white border-3 border-black p-6 rounded-xl">
            <p className="text-black font-medium leading-relaxed font-space-grotesk">
              {post.selftext.length > 200 
                ? `${post.selftext.substring(0, 200)}...` 
                : post.selftext
              }
            </p>
          </div>
        )}

        {/* Content Type Indicators */}
        <div className="flex flex-wrap gap-3 text-sm font-bold">
          {post.is_video && (
            <span className="bg-[#3A86FF] text-white px-3 py-2 border-2 border-black rounded-lg font-space-grotesk">
              🎥 VIDEO
            </span>
          )}
          {post.is_self && (
            <span className="bg-[#8AC926] text-black px-3 py-2 border-2 border-black rounded-lg font-space-grotesk">
              📝 TEXT POST
            </span>
          )}
          {post.domain && !post.is_self && (
            <span className="bg-[#FFBE0B] text-black px-3 py-2 border-2 border-black rounded-lg font-space-grotesk">
              🌐 {post.domain}
            </span>
          )}
          {post.awards > 0 && (
            <span className="bg-[#FF006E] text-white px-3 py-2 border-2 border-black rounded-lg font-space-grotesk">
              🏅 {post.awards} AWARDS
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 pt-4">
          <BrutalButton 
            onClick={() => window.open(post.url, '_blank')}
            variant="primary"
          >
            VIEW POST
          </BrutalButton>
          <BrutalButton 
            onClick={() => window.open(`https://reddit.com${post.permalink}`, '_blank')}
            variant="secondary"
          >
            REDDIT COMMENTS
          </BrutalButton>
        </div>
      </div>
    </BrutalCard>
  );
};

// Loading Component
const LoadingCard = () => (
  <BrutalCard className="mb-8" bgColor="bg-[#F8F9FA]">
    <div className="animate-pulse space-y-6">
      <div className="h-10 bg-[#8AC926] border-2 border-black rounded-lg"></div>
      <div className="h-6 bg-[#FFBE0B] border-2 border-black w-3/4 rounded-lg"></div>
      <div className="h-6 bg-[#3A86FF] border-2 border-black w-1/2 rounded-lg"></div>
    </div>
  </BrutalCard>
);

// Main Page Component
export default function ControversialRedditListings() {
  const [posts, setPosts] = useState<RedditPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<ControversialApiResponse['viral_metrics'] | null>(null);
  const [subreddit, setSubreddit] = useState('all');
  const [timeFilter, setTimeFilter] = useState('day');

  const fetchControversialPosts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/reddit/controversial?subreddit=${subreddit}&time=${timeFilter}&limit=20`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: ControversialApiResponse = await response.json();
      
      if (data.success) {
        setPosts(data.posts);
        setMetrics(data.viral_metrics);
      } else {
        throw new Error('Failed to fetch controversial posts');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching controversial posts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchControversialPosts();
  }, [subreddit, timeFilter]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] p-6">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        {/* Header Section */}
        <BrutalCard className="mb-12" bgColor="bg-[#FF006E]">
          <div className="text-center space-y-6">
            <h1 className="text-6xl font-bold text-white leading-tight font-unbounded">
              ⚡ CONTROVERSIAL REDDIT POSTS ⚡
            </h1>
            <p className="text-2xl font-bold text-white font-space-grotesk">
              THE MOST DEBATED & POLARIZING CONTENT ON REDDIT
            </p>
          </div>
        </BrutalCard>

        {/* Controls Section */}
        <BrutalCard className="mb-12" bgColor="bg-[#8AC926]">
          <div className="space-y-8">
            <h2 className="text-4xl font-bold text-black font-unbounded">🎛️ FILTER CONTROLS</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Subreddit Selection */}
              <div className="space-y-4">
                <label className="block text-xl font-bold text-black font-space-grotesk">SUBREDDIT:</label>
                <select
                  value={subreddit}
                  onChange={(e) => setSubreddit(e.target.value)}
                  className="w-full p-4 border-4 border-black text-lg font-bold bg-white focus:outline-none focus:shadow-[4px_4px_0px_0px_#000] rounded-xl font-space-grotesk"
                >
                  <option value="all">r/all (Global)</option>
                  <option value="unpopularopinion">r/unpopularopinion</option>
                  <option value="politics">r/politics</option>
                  <option value="changemyview">r/changemyview</option>
                  <option value="technology">r/technology</option>
                  <option value="movies">r/movies</option>
                </select>
              </div>

              {/* Time Filter Selection */}
              <div className="space-y-4">
                <label className="block text-xl font-bold text-black font-space-grotesk">TIME PERIOD:</label>
                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                  className="w-full p-4 border-4 border-black text-lg font-bold bg-white focus:outline-none focus:shadow-[4px_4px_0px_0px_#000] rounded-xl font-space-grotesk"
                >
                  <option value="hour">Last Hour</option>
                  <option value="day">Last 24 Hours</option>
                  <option value="week">Last Week</option>
                  <option value="month">Last Month</option>
                  <option value="year">Last Year</option>
                  <option value="all">All Time</option>
                </select>
              </div>
            </div>

            <div className="flex justify-center pt-4">
              <BrutalButton 
                onClick={fetchControversialPosts}
                variant="primary"
                disabled={loading}
              >
                {loading ? 'LOADING...' : 'REFRESH POSTS'}
              </BrutalButton>
            </div>
          </div>
        </BrutalCard>

        {/* Metrics Section */}
        {metrics && (
          <BrutalCard className="mb-12" bgColor="bg-[#3A86FF]">
            <div className="space-y-8">
              <h2 className="text-4xl font-bold text-white font-unbounded">📊 CONTROVERSY METRICS</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                <div className="bg-white border-3 border-black p-6 rounded-xl">
                  <div className="text-3xl font-bold text-[#FF006E] font-unbounded">
                    {metrics.total_score.toLocaleString()}
                  </div>
                  <div className="text-sm font-bold text-black font-space-grotesk mt-2">TOTAL UPVOTES</div>
                </div>
                
                <div className="bg-white border-3 border-black p-6 rounded-xl">
                  <div className="text-3xl font-bold text-[#8AC926] font-unbounded">
                    {metrics.average_score.toLocaleString()}
                  </div>
                  <div className="text-sm font-bold text-black font-space-grotesk mt-2">AVG SCORE</div>
                </div>
                
                <div className="bg-white border-3 border-black p-6 rounded-xl">
                  <div className="text-3xl font-bold text-[#FFBE0B] font-unbounded">
                    {metrics.total_comments.toLocaleString()}
                  </div>
                  <div className="text-sm font-bold text-black font-space-grotesk mt-2">TOTAL COMMENTS</div>
                </div>
                
                <div className="bg-white border-3 border-black p-6 rounded-xl">
                  <div className="text-3xl font-bold text-[#FF006E] font-unbounded">
                    {metrics.controversy_stats.highly_controversial + 
                     metrics.controversy_stats.very_controversial + 
                     metrics.controversy_stats.controversial}
                  </div>
                  <div className="text-sm font-bold text-black font-space-grotesk mt-2">CONTROVERSIAL</div>
                </div>
              </div>

              <div className="bg-white border-3 border-black p-8 rounded-xl">
                <h3 className="text-2xl font-bold text-black mb-6 font-unbounded">⚡ CONTROVERSY BREAKDOWN:</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                  <div>
                    <span className="text-3xl font-bold text-[#FF006E] font-unbounded">
                      {metrics.controversy_stats.highly_controversial}
                    </span>
                    <div className="text-sm font-bold text-black font-space-grotesk mt-2">HIGHLY CONTROVERSIAL</div>
                  </div>
                  <div>
                    <span className="text-3xl font-bold text-[#FFBE0B] font-unbounded">
                      {metrics.controversy_stats.very_controversial}
                    </span>
                    <div className="text-sm font-bold text-black font-space-grotesk mt-2">VERY CONTROVERSIAL</div>
                  </div>
                  <div>
                    <span className="text-3xl font-bold text-[#8AC926] font-unbounded">
                      {metrics.controversy_stats.controversial}
                    </span>
                    <div className="text-sm font-bold text-black font-space-grotesk mt-2">CONTROVERSIAL</div>
                  </div>
                </div>
              </div>
            </div>
          </BrutalCard>
        )}

        {/* Error State */}
        {error && (
          <BrutalCard className="mb-12" bgColor="bg-[#FF006E]">
            <div className="text-center space-y-6">
              <h2 className="text-4xl font-bold text-white font-unbounded">💥 ERROR OCCURRED</h2>
              <p className="text-xl font-bold text-white font-space-grotesk">{error}</p>
              <BrutalButton onClick={fetchControversialPosts} variant="secondary">
                TRY AGAIN
              </BrutalButton>
            </div>
          </BrutalCard>
        )}

        {/* Posts Section */}
        <div className="space-y-8">
          {loading ? (
            <>
              <LoadingCard />
              <LoadingCard />
              <LoadingCard />
            </>
          ) : posts.length > 0 ? (
            posts.map((post) => (
              <RedditPostCard key={post.id} post={post} />
            ))
          ) : (
            <BrutalCard bgColor="bg-[#FFBE0B]">
              <div className="text-center space-y-6">
                <h2 className="text-4xl font-bold text-black font-unbounded">📭 NO POSTS FOUND</h2>
                <p className="text-xl font-bold text-black font-space-grotesk">
                  Try adjusting your filters or check back later!
                </p>
              </div>
            </BrutalCard>
          )}
        </div>

        {/* Footer */}
        <BrutalCard className="mt-16" bgColor="bg-black">
          <div className="text-center">
            <p className="text-2xl font-bold text-white font-space-grotesk">
              🔥 POWERED BY REDDIT API & MODERN DESIGN 🔥
            </p>
          </div>
        </BrutalCard>
      </div>
    </div>
  );
}