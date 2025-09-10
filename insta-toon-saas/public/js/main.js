let referenceImageFile = null;
let generatedWebtoons = [];

document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
});

function initializeEventListeners() {
    const referenceUpload = document.getElementById('referenceUpload');
    const referenceFile = document.getElementById('referenceFile');
    
    // File upload event listeners
    referenceFile.addEventListener('change', handleReferenceUpload);
    
    // Drag and drop functionality
    referenceUpload.addEventListener('dragover', handleDragOver);
    referenceUpload.addEventListener('drop', handleDrop);
    referenceUpload.addEventListener('click', () => referenceFile.click());
    
    // Remove drag styling when leaving
    referenceUpload.addEventListener('dragleave', handleDragLeave);
}

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
            displayReferenceImage(file);
        } else {
            showNotification('이미지 파일만 업로드 가능합니다.', 'error');
        }
    }
}

function handleReferenceUpload(e) {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
        displayReferenceImage(file);
    } else {
        showNotification('유효한 이미지 파일을 선택해주세요.', 'error');
    }
}

function displayReferenceImage(file) {
    referenceImageFile = file;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const uploadContent = document.querySelector('#referenceUpload .upload-content');
        const preview = document.getElementById('referencePreview');
        const img = document.getElementById('referenceImg');
        
        img.src = e.target.result;
        uploadContent.style.display = 'none';
        preview.style.display = 'block';
        
        showNotification('래퍼런스 이미지가 업로드되었습니다.', 'success');
        validateForm();
    };
    reader.readAsDataURL(file);
}

function removeReference() {
    referenceImageFile = null;
    const uploadContent = document.querySelector('#referenceUpload .upload-content');
    const preview = document.getElementById('referencePreview');
    
    uploadContent.style.display = 'flex';
    preview.style.display = 'none';
    
    document.getElementById('referenceFile').value = '';
    validateForm();
}

function validateForm() {
    const generateBtn = document.getElementById('generateBtn');
    const storyContent = document.getElementById('storyContent').value.trim();
    
    if (referenceImageFile && storyContent.length > 10) {
        generateBtn.disabled = false;
        generateBtn.classList.remove('disabled');
    } else {
        generateBtn.disabled = true;
        generateBtn.classList.add('disabled');
    }
}

// Add event listener for story content validation
document.getElementById('storyContent').addEventListener('input', validateForm);

async function generateWebtoon() {
    if (!referenceImageFile) {
        showNotification('래퍼런스 이미지를 업로드해주세요.', 'error');
        return;
    }
    
    const storyContent = document.getElementById('storyContent').value.trim();
    if (!storyContent) {
        showNotification('웹툰 내용을 입력해주세요.', 'error');
        return;
    }
    
    const maintainCharacter = document.getElementById('maintainCharacter').checked;
    const multiPanel = document.getElementById('multiPanel').checked;
    
    // Get advanced options
    const artStyle = document.getElementById('artStyle').value;
    const quality = document.getElementById('quality').value;
    const aspectRatio = document.getElementById('aspectRatio').value;
    const additionalElements = document.getElementById('additionalElements').value;
    
    showLoadingModal();
    updateProgress(0, '래퍼런스 이미지 분석 중...');
    
    try {
        // Create FormData for file upload with advanced options
        const formData = new FormData();
        formData.append('referenceImage', referenceImageFile);
        formData.append('storyContent', storyContent);
        formData.append('maintainCharacter', maintainCharacter);
        formData.append('multiPanel', multiPanel);
        formData.append('artStyle', artStyle);
        formData.append('quality', quality);
        formData.append('aspectRatio', aspectRatio);
        formData.append('additionalElements', additionalElements);
        
        updateProgress(25, '고급 설정 적용 중...');
        
        // Send request to backend
        const response = await fetch('/api/generate-webtoon', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        updateProgress(75, `${quality === 'high' ? '고품질' : quality === 'medium' ? '중품질' : '저품질'} 웹툰 생성 중...`);
        
        const result = await response.json();
        
        updateProgress(100, '완료!');
        
        setTimeout(() => {
            hideLoadingModal();
            displayResults(result.webtoonPanels, result.metadata);
        }, 1000);
        
    } catch (error) {
        console.error('Error generating webtoon:', error);
        hideLoadingModal();
        showNotification('웹툰 생성 중 오류가 발생했습니다. 다시 시도해주세요.', 'error');
    }
}

// Toggle advanced features section
function toggleAdvancedFeatures() {
    const advancedSection = document.getElementById('step2_5');
    const advancedBtn = document.getElementById('advancedBtn');
    
    if (advancedSection.style.display === 'none') {
        advancedSection.style.display = 'block';
        advancedBtn.innerHTML = '<span>⚙️ 고급 기능 숨기기</span>';
        advancedSection.scrollIntoView({ behavior: 'smooth' });
    } else {
        advancedSection.style.display = 'none';
        advancedBtn.innerHTML = '<span>⚙️ 고급 기능</span>';
    }
}

// Tab functionality for advanced features
function showTab(tabName) {
    // Hide all content
    document.getElementById('blend-content').style.display = 'none';
    document.getElementById('character-content').style.display = 'none';
    
    // Remove active class from all tabs
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    // Show selected content and activate tab
    if (tabName === 'blend') {
        document.getElementById('blend-content').style.display = 'block';
        document.querySelector('.tab-btn[onclick="showTab(\'blend\')"]').classList.add('active');
    } else if (tabName === 'character') {
        document.getElementById('character-content').style.display = 'block';
        document.querySelector('.tab-btn[onclick="showTab(\'character\')"]').classList.add('active');
    }
}

// Image blending functionality
async function blendImages() {
    const blendImagesInput = document.getElementById('blendImages');
    const blendPrompt = document.getElementById('blendPrompt').value.trim();
    
    if (!blendImagesInput.files || blendImagesInput.files.length < 2) {
        showNotification('이미지 블렌딩을 위해서는 최소 2개의 이미지가 필요합니다.', 'error');
        return;
    }
    
    if (!blendPrompt) {
        showNotification('블렌딩 설명을 입력해주세요.', 'error');
        return;
    }
    
    if (blendImagesInput.files.length > 4) {
        showNotification('최대 4개의 이미지까지 블렌딩할 수 있습니다.', 'error');
        return;
    }
    
    showLoadingModal();
    updateProgress(0, '이미지들을 업로드 중...');
    
    try {
        const formData = new FormData();
        
        // Add all selected images
        Array.from(blendImagesInput.files).forEach((file, index) => {
            formData.append('images', file);
        });
        
        formData.append('blendPrompt', blendPrompt);
        formData.append('artStyle', document.getElementById('artStyle').value);
        formData.append('quality', document.getElementById('quality').value);
        formData.append('aspectRatio', document.getElementById('aspectRatio').value);
        
        updateProgress(30, '이미지 블렌딩 중...');
        
        const response = await fetch('/api/blend-images', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        updateProgress(80, '결과 처리 중...');
        
        const result = await response.json();
        
        updateProgress(100, '블렌딩 완료!');
        
        setTimeout(() => {
            hideLoadingModal();
            displayBlendResult(result.blendedImage);
        }, 1000);
        
    } catch (error) {
        console.error('Error blending images:', error);
        hideLoadingModal();
        showNotification('이미지 블렌딩 중 오류가 발생했습니다.', 'error');
    }
}

// Character generation functionality
async function generateCharacter() {
    const characterDescription = document.getElementById('characterDescription').value.trim();
    
    if (!characterDescription) {
        showNotification('캐릭터 설명을 입력해주세요.', 'error');
        return;
    }
    
    showLoadingModal();
    updateProgress(0, '캐릭터 설정 분석 중...');
    
    try {
        const formData = new FormData();
        formData.append('characterDescription', characterDescription);
        formData.append('artStyle', document.getElementById('artStyle').value);
        formData.append('quality', document.getElementById('quality').value);
        
        const poses = document.getElementById('characterPoses').value.trim();
        if (poses) {
            formData.append('poses', poses);
        }
        
        // Add reference style if main reference image is available
        if (referenceImageFile) {
            formData.append('referenceStyle', referenceImageFile);
        }
        
        updateProgress(40, '캐릭터 레퍼런스 시트 생성 중...');
        
        const response = await fetch('/api/generate-character', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        updateProgress(80, '결과 처리 중...');
        
        const result = await response.json();
        
        updateProgress(100, '캐릭터 생성 완료!');
        
        setTimeout(() => {
            hideLoadingModal();
            displayCharacterResult(result.characterSheet);
        }, 1000);
        
    } catch (error) {
        console.error('Error generating character:', error);
        hideLoadingModal();
        showNotification('캐릭터 생성 중 오류가 발생했습니다.', 'error');
    }
}

function showLoadingModal() {
    document.getElementById('loadingModal').style.display = 'flex';
    document.getElementById('generateBtn').disabled = true;
}

function hideLoadingModal() {
    document.getElementById('loadingModal').style.display = 'none';
    document.getElementById('generateBtn').disabled = false;
}

function updateProgress(percent, status) {
    document.getElementById('progressFill').style.width = percent + '%';
    document.getElementById('loadingStatus').textContent = status;
}

function displayResults(webtoonPanels, metadata = {}) {
    generatedWebtoons = webtoonPanels;
    
    const resultsContainer = document.getElementById('resultsContainer');
    const step4 = document.getElementById('step4');
    const actionButtons = document.getElementById('actionButtons');
    
    // Clear previous results
    resultsContainer.innerHTML = '';
    
    // Display metadata info
    if (metadata.usingNanoBanana) {
        const metaDiv = document.createElement('div');
        metaDiv.className = 'generation-metadata';
        metaDiv.innerHTML = `
            <div class="meta-info">
                <h4>🎨 생성 정보</h4>
                <p><strong>패널 수:</strong> ${metadata.totalPanels}</p>
                <p><strong>나노바나나 API:</strong> 활성화</p>
                <p><strong>캐릭터 일관성:</strong> ${metadata.maintainCharacter ? '유지' : '비활성화'}</p>
                <p><strong>생성 시간:</strong> ${new Date(metadata.generatedAt).toLocaleString('ko-KR')}</p>
            </div>
        `;
        resultsContainer.appendChild(metaDiv);
    }
    
    // Display each panel
    webtoonPanels.forEach((panel, index) => {
        const panelDiv = document.createElement('div');
        panelDiv.className = 'webtoon-panel';
        
        let panelInfo = '';
        if (panel.imageGenerated) {
            panelInfo = '<div class="panel-badge success">🎨 AI 생성</div>';
        } else if (panel.error) {
            panelInfo = '<div class="panel-badge error">⚠️ 샘플</div>';
        }
        
        panelDiv.innerHTML = `
            ${panelInfo}
            <img src="${panel.imageUrl}" alt="웹툰 패널 ${index + 1}" class="panel-image">
            <div class="panel-info">
                <h4>패널 ${index + 1}</h4>
                <p class="panel-description">${panel.description || `패널 ${index + 1}`}</p>
                ${panel.generatedText ? `<p class="ai-response"><small><strong>AI 응답:</strong> ${panel.generatedText.substring(0, 100)}...</small></p>` : ''}
            </div>
        `;
        resultsContainer.appendChild(panelDiv);
    });
    
    // Show results section and action buttons
    step4.style.display = 'block';
    actionButtons.style.display = 'flex';
    
    // Scroll to results
    step4.scrollIntoView({ behavior: 'smooth' });
    
    const realImagesCount = webtoonPanels.filter(p => p.imageGenerated).length;
    const message = realImagesCount > 0 
        ? `${realImagesCount}개의 실제 AI 이미지와 ${webtoonPanels.length - realImagesCount}개의 샘플이 생성되었습니다!`
        : `${webtoonPanels.length}개의 웹툰 패널이 생성되었습니다!`;
    
    showNotification(message, 'success');
}

// Display blend result
function displayBlendResult(blendedImage) {
    const resultsContainer = document.getElementById('resultsContainer');
    const step4 = document.getElementById('step4');
    const actionButtons = document.getElementById('actionButtons');
    
    // Clear previous results
    resultsContainer.innerHTML = '';
    
    const resultDiv = document.createElement('div');
    resultDiv.className = 'blend-result';
    resultDiv.innerHTML = `
        <div class="result-header">
            <h3>🎨 이미지 블렌딩 결과</h3>
            ${blendedImage.imageGenerated ? '<div class="panel-badge success">AI 생성</div>' : '<div class="panel-badge error">샘플</div>'}
        </div>
        <img src="${blendedImage.imageUrl}" alt="블렌딩된 이미지" class="blend-image">
        <div class="blend-info">
            <p><strong>프롬프트:</strong> ${blendedImage.prompt}</p>
            <p><strong>스타일:</strong> ${blendedImage.style}</p>
            <p><strong>품질:</strong> ${blendedImage.quality}</p>
            <p><strong>비율:</strong> ${blendedImage.aspectRatio}</p>
            ${blendedImage.responseText ? `<p><strong>AI 응답:</strong> ${blendedImage.responseText.substring(0, 200)}...</p>` : ''}
        </div>
    `;
    resultsContainer.appendChild(resultDiv);
    
    // Show results section
    step4.style.display = 'block';
    actionButtons.style.display = 'flex';
    
    // Scroll to results
    step4.scrollIntoView({ behavior: 'smooth' });
    
    showNotification('이미지 블렌딩이 완료되었습니다!', 'success');
}

// Display character result
function displayCharacterResult(characterSheet) {
    const resultsContainer = document.getElementById('resultsContainer');
    const step4 = document.getElementById('step4');
    const actionButtons = document.getElementById('actionButtons');
    
    // Clear previous results
    resultsContainer.innerHTML = '';
    
    const resultDiv = document.createElement('div');
    resultDiv.className = 'character-result';
    resultDiv.innerHTML = `
        <div class="result-header">
            <h3>👤 캐릭터 레퍼런스 시트</h3>
            ${characterSheet.imageGenerated ? '<div class="panel-badge success">AI 생성</div>' : '<div class="panel-badge error">샘플</div>'}
        </div>
        <img src="${characterSheet.imageUrl}" alt="캐릭터 레퍼런스" class="character-image">
        <div class="character-info">
            <p><strong>캐릭터:</strong> ${characterSheet.characterDescription}</p>
            <p><strong>스타일:</strong> ${characterSheet.style}</p>
            <p><strong>포즈:</strong> ${characterSheet.poses.join(', ')}</p>
            <p><strong>품질:</strong> ${characterSheet.quality}</p>
            ${characterSheet.responseText ? `<p><strong>AI 응답:</strong> ${characterSheet.responseText.substring(0, 200)}...</p>` : ''}
        </div>
    `;
    resultsContainer.appendChild(resultDiv);
    
    // Show results section
    step4.style.display = 'block';
    actionButtons.style.display = 'flex';
    
    // Scroll to results
    step4.scrollIntoView({ behavior: 'smooth' });
    
    showNotification('캐릭터 레퍼런스 시트가 생성되었습니다!', 'success');
}

function regenerate() {
    const step4 = document.getElementById('step4');
    step4.style.display = 'none';
    
    // Scroll back to content input
    document.getElementById('step2').scrollIntoView({ behavior: 'smooth' });
    
    showNotification('새로운 웹툰을 생성해보세요.', 'info');
}

function downloadWebtoon() {
    if (generatedWebtoons.length === 0) {
        showNotification('다운로드할 웹툰이 없습니다.', 'error');
        return;
    }
    
    // Create a zip file with all panels
    generatedWebtoons.forEach((panel, index) => {
        const link = document.createElement('a');
        link.href = panel.imageUrl;
        link.download = `webtoon_panel_${index + 1}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
    
    showNotification('웹툰 패널들이 다운로드되었습니다.', 'success');
}

function shareWebtoon() {
    if (generatedWebtoons.length === 0) {
        showNotification('공유할 웹툰이 없습니다.', 'error');
        return;
    }
    
    // Simple share functionality
    if (navigator.share) {
        navigator.share({
            title: '인스타툰으로 만든 웹툰',
            text: '인스타툰에서 AI로 생성한 웹툰을 확인해보세요!',
            url: window.location.href
        });
    } else {
        // Fallback: copy URL to clipboard
        navigator.clipboard.writeText(window.location.href).then(() => {
            showNotification('링크가 클립보드에 복사되었습니다.', 'success');
        });
    }
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Add styles
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '15px 20px',
        borderRadius: '8px',
        color: 'white',
        fontWeight: '500',
        zIndex: '10000',
        maxWidth: '300px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        animation: 'slideInRight 0.3s ease'
    });
    
    // Set background color based on type
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };
    notification.style.backgroundColor = colors[type] || colors.info;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .notification {
        cursor: pointer;
        transition: transform 0.2s ease;
    }
    
    .notification:hover {
        transform: translateX(-5px);
    }
`;
document.head.appendChild(style);