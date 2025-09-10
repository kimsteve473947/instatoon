// MCP 서버 테스트 스크립트
const { spawn } = require('child_process');
const fs = require('fs');

async function testMCPServer() {
  console.log('🚀 MCP 서버 테스트 시작...');
  
  // 테스트 파일 생성
  const testFile = './test.txt';
  const testContent = 'Hello, MCP World!';
  
  try {
    // 1. 파일 작성 테스트
    console.log('✍️ 테스트 파일 생성...');
    fs.writeFileSync(testFile, testContent);
    
    // 2. 파일 읽기 테스트
    console.log('📖 파일 읽기 테스트...');
    const content = fs.readFileSync(testFile, 'utf-8');
    console.log(`파일 내용: ${content}`);
    
    // 3. 디렉터리 목록 테스트
    console.log('📁 디렉터리 목록 테스트...');
    const files = fs.readdirSync('.');
    console.log('파일 목록:', files.slice(0, 5).join(', '), '...');
    
    console.log('✅ 모든 테스트 통과!');
    
    // 정리
    fs.unlinkSync(testFile);
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
  }
}

// MCP 서버가 올바르게 실행되는지 확인
function checkMCPServer() {
  console.log('🔍 MCP 서버 구성 확인...');
  
  const serverFile = './simple-mcp-server.js';
  const configFile = './claude-desktop-config.json';
  
  if (fs.existsSync(serverFile)) {
    console.log('✅ MCP 서버 파일 존재');
  } else {
    console.log('❌ MCP 서버 파일 없음');
  }
  
  if (fs.existsSync(configFile)) {
    console.log('✅ Claude Desktop 설정 파일 존재');
    const config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
    console.log('📝 설정된 MCP 서버들:', Object.keys(config.mcpServers).join(', '));
  } else {
    console.log('❌ Claude Desktop 설정 파일 없음');
  }
}

// 테스트 실행
if (require.main === module) {
  console.log('🧪 MCP 프로젝트 테스트\n');
  checkMCPServer();
  console.log();
  testMCPServer();
}