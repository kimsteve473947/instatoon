const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const sharp = require('sharp');

// Create test images for advanced features
async function createTestImages() {
    // Reference anime-style image
    const animeImage = `
    <svg width="300" height="400" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#FFE5E5"/>
      <!-- Anime character -->
      <circle cx="150" cy="150" r="60" fill="#FFDDDD" stroke="#FF69B4" stroke-width="2"/>
      <circle cx="130" cy="130" r="8" fill="#000"/>
      <circle cx="170" cy="130" r="8" fill="#000"/>
      <path d="M 120 180 Q 150 200 180 180" stroke="#FF1493" stroke-width="3" fill="none"/>
      <text x="150" y="250" text-anchor="middle" font-size="16" fill="#FF69B4">Anime Style</text>
      <text x="150" y="280" text-anchor="middle" font-size="12" fill="#666">Reference Image</text>
    </svg>`;
    
    // Background image
    const backgroundImage = `
    <svg width="300" height="400" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#87CEEB;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#98FB98;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#sky)"/>
      <circle cx="50" cy="50" r="30" fill="#FFD700"/>
      <text x="150" y="350" text-anchor="middle" font-size="16" fill="#228B22">Beautiful Background</text>
    </svg>`;
    
    await sharp(Buffer.from(animeImage))
        .jpeg({ quality: 90 })
        .toFile('test-anime.jpg');
        
    await sharp(Buffer.from(backgroundImage))
        .jpeg({ quality: 90 })
        .toFile('test-background.jpg');
        
    console.log('Test images created: test-anime.jpg, test-background.jpg');
}

// Test the advanced webtoon generation API
async function testAdvancedWebtoonAPI() {
    try {
        console.log('=== Testing Advanced Webtoon Generation API ===');
        
        const form = new FormData();
        form.append('referenceImage', fs.createReadStream('test-anime.jpg'));
        form.append('storyContent', '봄날 학교 옥상에서 친구들과 도시락을 먹으며 대화하는 고등학생들. 벚꽃이 날리고 있고, 모두 행복해 보인다.');
        form.append('maintainCharacter', 'true');
        form.append('multiPanel', 'true');
        form.append('artStyle', 'anime');
        form.append('quality', 'high');
        form.append('aspectRatio', 'vertical');
        form.append('additionalElements', '벚꽃, 학교 유니폼, 따뜻한 조명, 도시락');
        
        const response = await axios.post('http://localhost:3000/api/generate-webtoon', form, {
            headers: {
                ...form.getHeaders(),
            },
            timeout: 120000
        });
        
        console.log('✅ Advanced Webtoon API Test - Success');
        console.log('Generated panels:', response.data.webtoonPanels.length);
        console.log('Using nano-banana:', response.data.metadata.usingNanoBanana);
        
        return true;
    } catch (error) {
        console.error('❌ Advanced Webtoon API Test - Failed:', error.response?.data?.error || error.message);
        return false;
    }
}

// Test image blending API
async function testImageBlendingAPI() {
    try {
        console.log('\n=== Testing Image Blending API ===');
        
        const form = new FormData();
        form.append('images', fs.createReadStream('test-anime.jpg'));
        form.append('images', fs.createReadStream('test-background.jpg'));
        form.append('blendPrompt', '애니메이션 캐릭터를 아름다운 배경과 자연스럽게 조합하여 웹툰 스타일의 완성된 씬을 만들어주세요.');
        form.append('artStyle', 'anime');
        form.append('quality', 'high');
        form.append('aspectRatio', 'vertical');
        
        const response = await axios.post('http://localhost:3000/api/blend-images', form, {
            headers: {
                ...form.getHeaders(),
            },
            timeout: 120000
        });
        
        console.log('✅ Image Blending API Test - Success');
        console.log('Blended image URL:', response.data.blendedImage.imageUrl);
        console.log('AI Generated:', response.data.blendedImage.imageGenerated);
        
        return true;
    } catch (error) {
        console.error('❌ Image Blending API Test - Failed:', error.response?.data?.error || error.message);
        return false;
    }
}

// Test character generation API
async function testCharacterGenerationAPI() {
    try {
        console.log('\n=== Testing Character Generation API ===');
        
        const form = new FormData();
        form.append('characterDescription', '17세 고등학생 소녀. 긴 갈색 머리, 큰 눈, 학교 유니폼 착용. 밝고 친근한 성격으로 항상 미소를 짓고 있음. 키는 160cm 정도이고 날씬한 체형.');
        form.append('artStyle', 'anime');
        form.append('quality', 'high');
        form.append('poses', '서있기, 앉아서 책읽기, 걷기, 인사하기');
        form.append('referenceStyle', fs.createReadStream('test-anime.jpg'));
        
        const response = await axios.post('http://localhost:3000/api/generate-character', form, {
            headers: {
                ...form.getHeaders(),
            },
            timeout: 120000
        });
        
        console.log('✅ Character Generation API Test - Success');
        console.log('Character sheet URL:', response.data.characterSheet.imageUrl);
        console.log('Poses:', response.data.characterSheet.poses.join(', '));
        console.log('AI Generated:', response.data.characterSheet.imageGenerated);
        
        return true;
    } catch (error) {
        console.error('❌ Character Generation API Test - Failed:', error.response?.data?.error || error.message);
        return false;
    }
}

// Test styles API
async function testStylesAPI() {
    try {
        console.log('\n=== Testing Styles API ===');
        
        const response = await axios.get('http://localhost:3000/api/styles');
        
        console.log('✅ Styles API Test - Success');
        console.log('Available art styles:', Object.keys(response.data.styles).join(', '));
        console.log('Quality levels:', Object.keys(response.data.qualityLevels).join(', '));
        console.log('Aspect ratios:', Object.keys(response.data.aspectRatios).join(', '));
        
        return true;
    } catch (error) {
        console.error('❌ Styles API Test - Failed:', error.response?.data?.error || error.message);
        return false;
    }
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Starting Advanced Webtoon Platform Tests...\n');
    
    await createTestImages();
    
    let passedTests = 0;
    let totalTests = 4;
    
    // Test each API
    if (await testStylesAPI()) passedTests++;
    if (await testAdvancedWebtoonAPI()) passedTests++;
    if (await testImageBlendingAPI()) passedTests++;
    if (await testCharacterGenerationAPI()) passedTests++;
    
    // Cleanup
    try {
        fs.unlinkSync('test-anime.jpg');
        fs.unlinkSync('test-background.jpg');
        console.log('\nCleaned up test files');
    } catch (err) {
        // Ignore cleanup errors
    }
    
    // Summary
    console.log(`\n🎯 Test Results: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
        console.log('🎉 All tests passed! The enhanced webtoon platform is ready!');
    } else {
        console.log('⚠️  Some tests failed. Please check the server and API implementation.');
    }
}

// Run tests
if (require.main === module) {
    runAllTests();
}

module.exports = { runAllTests };