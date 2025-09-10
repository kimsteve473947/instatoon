const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const sharp = require('sharp');

// Create a simple test image
async function createTestImage() {
  const svgImage = `
    <svg width="300" height="400" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#FFE5E5"/>
      <circle cx="150" cy="150" r="60" fill="#FF69B4"/>
      <circle cx="130" cy="130" r="10" fill="#000"/>
      <circle cx="170" cy="130" r="10" fill="#000"/>
      <path d="M 120 180 Q 150 200 180 180" stroke="#000" stroke-width="3" fill="none"/>
      <text x="150" y="250" text-anchor="middle" font-size="20" fill="#333">anime style</text>
      <text x="150" y="280" text-anchor="middle" font-size="16" fill="#666">reference art</text>
    </svg>
  `;
  
  await sharp(Buffer.from(svgImage))
    .jpeg({ quality: 90 })
    .toFile('test-reference.jpg');
    
  console.log('Test reference image created: test-reference.jpg');
}

// Test the API
async function testWebtoonAPI() {
  try {
    console.log('Creating test reference image...');
    await createTestImage();
    
    console.log('Testing webtoon generation API...');
    
    const form = new FormData();
    form.append('referenceImage', fs.createReadStream('test-reference.jpg'));
    form.append('storyContent', '카페에서 따뜻한 커피를 마시며 책을 읽는 소녀. 창밖으로는 비가 내리고 있다.');
    form.append('maintainCharacter', 'true');
    form.append('multiPanel', 'false');
    
    const response = await axios.post('http://localhost:3000/api/generate-webtoon', form, {
      headers: {
        ...form.getHeaders(),
        'Content-Type': 'multipart/form-data'
      },
      timeout: 60000 // 60 seconds timeout
    });
    
    console.log('API Response Status:', response.status);
    console.log('API Response Data:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success) {
      console.log('\n✅ SUCCESS! Webtoon generated successfully!');
      console.log(`Generated ${response.data.webtoonPanels.length} panels:`);
      
      response.data.webtoonPanels.forEach((panel, index) => {
        console.log(`Panel ${index + 1}:`);
        console.log(`  - Image URL: ${panel.imageUrl}`);
        console.log(`  - Description: ${panel.description}`);
        console.log(`  - Real Image Generated: ${panel.imageGenerated || false}`);
        if (panel.generatedText) {
          console.log(`  - AI Response: ${panel.generatedText.substring(0, 100)}...`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ API Test Failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  } finally {
    // Clean up test file
    try {
      fs.unlinkSync('test-reference.jpg');
      console.log('Cleaned up test file');
    } catch (err) {
      // Ignore cleanup errors
    }
  }
}

// Run the test
if (require.main === module) {
  testWebtoonAPI();
}

module.exports = { testWebtoonAPI, createTestImage };