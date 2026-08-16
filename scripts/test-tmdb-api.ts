/**
 * Test TMDb API Connection
 * 
 * Run this script to verify your TMDb API key is working correctly
 * 
 * Usage: npx tsx scripts/test-tmdb-api.ts
 */

import 'dotenv/config';

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_URL = 'https://image.tmdb.org/t/p/w500';

async function testTMDbAPI() {
  console.log('\n🎬 Testing TMDb API Configuration...\n');

  // Check if API key exists
  if (!TMDB_API_KEY || TMDB_API_KEY === '' || TMDB_API_KEY === 'your_tmdb_api_key_here') {
    console.error('❌ TMDb API key not configured!');
    console.log('\n📝 Please follow these steps:');
    console.log('1. Read SETUP_TMDB_API.md for detailed instructions');
    console.log('2. Get your free API key from https://www.themoviedb.org/settings/api');
    console.log('3. Add it to .env.local file as NEXT_PUBLIC_TMDB_API_KEY=your_key_here');
    console.log('4. Restart your dev server\n');
    process.exit(1);
  }

  console.log('✅ API key found in environment\n');

  try {
    // Test 1: Configuration endpoint
    console.log('Test 1: Checking API configuration...');
    const configUrl = `${TMDB_BASE_URL}/configuration?api_key=${TMDB_API_KEY}`;
    const configResponse = await fetch(configUrl);
    
    if (!configResponse.ok) {
      throw new Error(`API returned ${configResponse.status}: ${configResponse.statusText}`);
    }
    
    const configData = await configResponse.json();
    console.log('✅ API configuration successful');
    console.log(`   Image base URL: ${configData.images.secure_base_url}`);
    console.log('');

    // Test 2: Fetch trending movies
    console.log('Test 2: Fetching trending movies...');
    const trendingUrl = `${TMDB_BASE_URL}/trending/movie/week?api_key=${TMDB_API_KEY}`;
    const trendingResponse = await fetch(trendingUrl);
    
    if (!trendingResponse.ok) {
      throw new Error(`API returned ${trendingResponse.status}: ${trendingResponse.statusText}`);
    }
    
    const trendingData = await trendingResponse.json();
    console.log(`✅ Fetched ${trendingData.results.length} trending movies`);
    console.log('');

    // Test 3: Display first 5 movies with images
    console.log('Test 3: Movie data with images...\n');
    trendingData.results.slice(0, 5).forEach((movie: any, index: number) => {
      const imageUrl = movie.poster_path 
        ? `${TMDB_IMAGE_URL}${movie.poster_path}`
        : 'No poster available';
      
      console.log(`${index + 1}. ${movie.title} (${new Date(movie.release_date).getFullYear()})`);
      console.log(`   Rating: ⭐ ${movie.vote_average.toFixed(1)}/10`);
      console.log(`   Poster: ${imageUrl}`);
      console.log('');
    });

    // Test 4: Fetch popular movies
    console.log('Test 4: Fetching popular movies...');
    const popularUrl = `${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}`;
    const popularResponse = await fetch(popularUrl);
    
    if (!popularResponse.ok) {
      throw new Error(`API returned ${popularResponse.status}: ${popularResponse.statusText}`);
    }
    
    const popularData = await popularResponse.json();
    console.log(`✅ Fetched ${popularData.results.length} popular movies`);
    console.log('');

    // Test 5: Fetch genres
    console.log('Test 5: Fetching movie genres...');
    const genresUrl = `${TMDB_BASE_URL}/genre/movie/list?api_key=${TMDB_API_KEY}`;
    const genresResponse = await fetch(genresUrl);
    
    if (!genresResponse.ok) {
      throw new Error(`API returned ${genresResponse.status}: ${genresResponse.statusText}`);
    }
    
    const genresData = await genresResponse.json();
    console.log(`✅ Fetched ${genresData.genres.length} genres`);
    console.log(`   Available: ${genresData.genres.map((g: any) => g.name).slice(0, 5).join(', ')}...`);
    console.log('');

    // Success summary
    console.log('🎉 SUCCESS! Your TMDb API is working perfectly!\n');
    console.log('✅ All tests passed');
    console.log('✅ API key is valid');
    console.log('✅ Movie data is loading');
    console.log('✅ Images are available');
    console.log('\n💡 You can now start your dev server: npm run dev\n');

  } catch (error: any) {
    console.error('\n❌ API Test Failed!\n');
    
    if (error.message.includes('401')) {
      console.error('🔑 Invalid API Key');
      console.log('\nPossible issues:');
      console.log('- The API key is incorrect');
      console.log('- The key has been revoked');
      console.log('- Your TMDb account email is not verified');
      console.log('\n📝 Solution: Get a new API key from https://www.themoviedb.org/settings/api\n');
    } else if (error.message.includes('429')) {
      console.error('⚠️ Rate Limit Exceeded');
      console.log('\nYou have made too many requests. Wait a few minutes and try again.\n');
    } else if (error.message.includes('fetch')) {
      console.error('🌐 Network Error');
      console.log('\nPossible issues:');
      console.log('- No internet connection');
      console.log('- TMDb API is down');
      console.log('- Firewall blocking the request');
      console.log('\n📝 Solution: Check your internet connection and try again\n');
    } else {
      console.error('Error details:', error.message);
      console.log('\n📝 Check SETUP_TMDB_API.md for troubleshooting steps\n');
    }
    
    process.exit(1);
  }
}

// Run the test
testTMDbAPI();
