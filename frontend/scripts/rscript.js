import snoowrap from 'snoowrap';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../.env.local' });

console.log('Checking Reddit credentials...');
console.log('USER_AGENT:', process.env.REDDIT_USER_AGENT ? 'Set' : 'Missing');
console.log('CLIENT_ID:', process.env.REDDIT_CLIENT_ID ? 'Set' : 'Missing');
console.log('CLIENT_SECRET:', process.env.REDDIT_CLIENT_SECRET ? 'Set' : 'Missing');
console.log('USERNAME:', process.env.REDDIT_USERNAME ? 'Set' : 'Missing');
console.log('PASSWORD:', process.env.REDDIT_PASSWORD ? 'Set' : 'Missing');

// Check if all required credentials are available
if (!process.env.REDDIT_USER_AGENT || !process.env.REDDIT_CLIENT_ID || 
    !process.env.REDDIT_CLIENT_SECRET || !process.env.REDDIT_USERNAME || 
    !process.env.REDDIT_PASSWORD) {
  
  console.log('\nMissing Reddit API credentials!');
  console.log('Please add the following to your .env.local file:');
  console.log('REDDIT_USER_AGENT=YourApp/1.0');
  console.log('REDDIT_CLIENT_ID=your_client_id');
  console.log('REDDIT_CLIENT_SECRET=your_client_secret');
  console.log('REDDIT_USERNAME=your_username');
  console.log('REDDIT_PASSWORD=your_password');
  console.log('\nUsing mock data instead...');
  
  // Generate mock Reddit data
  const mockPosts = [
    'Revolutionary breakthrough in AI technology that could change everything',
    'I built an amazing project over the weekend, here\'s what I learned',
    'The future of programming: What every developer should know',
    'ELI5: How does machine learning actually work?',
    'New startup raises $50M to revolutionize tech industry',
    'Amazing open source project that everyone should know about'
  ];
  
  console.log('\nMock Reddit Hot Posts:');
  console.log('=' .repeat(60));
  mockPosts.forEach((title, index) => {
  });
  
  process.exit(0);
}

async function fetchRedditPosts() {
  try {
    console.log('\nConnecting to Reddit API...');
    
    const r = new snoowrap({
      userAgent: process.env.REDDIT_USER_AGENT,
      clientId: process.env.REDDIT_CLIENT_ID,
      clientSecret: process.env.REDDIT_CLIENT_SECRET,
      username: process.env.REDDIT_USERNAME,
      password: process.env.REDDIT_PASSWORD
    });

    // Set request delay to avoid rate limits
    r.config({ requestDelay: 1000, warnings: false });

    console.log('Successfully connected to Reddit!');
    console.log('\nFetching hot posts from Reddit front page...');
    
    // Get hot posts and display titles
    const posts = await r.getHot();
    
    if (posts && posts.length > 0) {
      console.log('\nReddit Hot Posts:');
      console.log('=' .repeat(60));
      
      posts.forEach((post, index) => {
        console.log(`\n${index + 1}. ${post.title}`);
        console.log(`   u/${post.author.name} in r/${post.subreddit.display_name}`);
        console.log(`   ${post.score} points | ${post.num_comments} comments`);
        console.log(`   ${post.url}`);
      });
      
      console.log('\nSuccessfully fetched Reddit posts!');
    } else {
      throw new Error('No posts returned from Reddit API');
    }

  } catch (error) {
    console.error('Error with Reddit API:', error.message);
    
    // Fallback to mock data
    console.log('\nFalling back to mock data...');
    const mockPosts = [
      {
        title: 'Revolutionary breakthrough in AI technology that could change everything',
        author: 'TechExplorer2025',
        subreddit: 'technology',
        score: 15420,
        comments: 892,
        url: 'https://example.com/ai-breakthrough'
      },
      {
        title: 'I built an amazing project over the weekend, here\'s what I learned',
        author: 'WeekendCoder',
        subreddit: 'programming',
        score: 8930,
        comments: 456,
        url: 'https://github.com/user/weekend-project'
      },
      {
        title: 'The future of programming: What every developer should know',
        author: 'FutureDev',
        subreddit: 'programming',
        score: 6780,
        comments: 234,
        url: 'https://medium.com/future-programming'
      },
      {
        title: 'ELI5: How does machine learning actually work?',
        author: 'CuriousLearner',
        subreddit: 'explainlikeimfive',
        score: 4560,
        comments: 312,
        url: 'https://reddit.com/r/explainlikeimfive/comments/eli5ml'
      },
      {
        title: 'New startup raises $50M to revolutionize tech industry',
        author: 'StartupNews',
        subreddit: 'startups',
        score: 3240,
        comments: 189,
        url: 'https://techcrunch.com/startup-funding'
      },
      {
        title: 'Amazing open source project that everyone should know about',
        author: 'OpenSourceFan',
        subreddit: 'opensource',
        score: 2890,
        comments: 156,
        url: 'https://github.com/amazing/project'
      }
    ];
    
    console.log('\n Mock Reddit Hot Posts:');
    console.log('=' .repeat(60));
    mockPosts.forEach((post, index) => {
      console.log(`\n${index + 1}. ${post.title}`);
      console.log(`   u/${post.author} in r/${post.subreddit}`);
      console.log(`   ${post.score} points | ${post.comments} comments`);
      console.log(`   ${post.url}`);
    });
    
    console.log('\nMock data displayed successfully!');
  }
}

// Run the async function
fetchRedditPosts().catch(console.error);