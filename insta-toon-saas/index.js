const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');
const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'public/uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

// MCP Server setup
const server = new Server(
  {
    name: "instartoon-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define MCP tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_project_info",
        description: "Get information about the current project",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "create_file",
        description: "Create a new file with content",
        inputSchema: {
          type: "object",
          properties: {
            filename: {
              type: "string",
              description: "Name of the file to create",
            },
            content: {
              type: "string", 
              description: "Content to write to the file",
            },
          },
          required: ["filename", "content"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "get_project_info":
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              name: "Instartoon MCP Project",
              description: "MCP enabled project for Instartoon",
              capabilities: ["file operations", "web scraping", "database access"],
              status: "active"
            }, null, 2),
          },
        ],
      };

    case "create_file":
      const fs = require('fs');
      try {
        fs.writeFileSync(args.filename, args.content);
        return {
          content: [
            {
              type: "text",
              text: `File '${args.filename}' created successfully`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text", 
              text: `Error creating file: ${error.message}`,
            },
          ],
        };
      }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Express routes
app.get('/', (req, res) => {
  res.json({
    message: 'MCP Server is running',
    capabilities: ['filesystem', 'web', 'sqlite'],
    endpoints: {
      health: '/health',
      mcp: '/mcp'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Helper function to convert file to base64
function fileToGenerativePart(filePath, mimeType) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(filePath)).toString("base64"),
      mimeType
    },
  };
}

// Helper function to create sample images for demonstration
async function createSampleImage(storyContent, panelNumber, isError = false) {
  try {
    const width = 400;
    const height = 600;
    
    // Create a sample webtoon-style image using Sharp
    const svgImage = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#f8f9ff;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#e6edff;stop-opacity:1" />
        </linearGradient>
        ${isError ? `
        <linearGradient id="errorBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#ffe6e6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#ffcccc;stop-opacity:1" />
        </linearGradient>` : ''}
      </defs>
      
      <rect width="100%" height="100%" fill="${isError ? 'url(#errorBg)' : 'url(#bg)'}"/>
      
      <!-- Webtoon panel border -->
      <rect x="10" y="10" width="${width-20}" height="${height-20}" 
            fill="none" stroke="#333" stroke-width="3" rx="15"/>
      
      <!-- Panel number -->
      <circle cx="50" cy="50" r="20" fill="#667eea"/>
      <text x="50" y="58" text-anchor="middle" fill="white" font-size="16" font-weight="bold">
        ${panelNumber}
      </text>
      
      <!-- Title -->
      <text x="${width/2}" y="100" text-anchor="middle" fill="#333" font-size="18" font-weight="bold">
        ${isError ? 'Error Panel' : 'Generated Panel'}
      </text>
      
      <!-- Story content (wrapped) -->
      <foreignObject x="30" y="130" width="${width-60}" height="300">
        <div xmlns="http://www.w3.org/1999/xhtml" style="
          font-family: 'Arial', sans-serif;
          font-size: 14px;
          line-height: 1.5;
          color: #555;
          text-align: center;
          padding: 20px;
          background: rgba(255,255,255,0.8);
          border-radius: 10px;
          word-wrap: break-word;
        ">
          ${storyContent.length > 100 ? storyContent.substring(0, 100) + '...' : storyContent}
        </div>
      </foreignObject>
      
      <!-- Placeholder character -->
      <circle cx="${width/2}" cy="450" r="40" fill="#ffb3ba"/>
      <circle cx="${width/2 - 12}" cy="440" r="8" fill="#333"/>
      <circle cx="${width/2 + 12}" cy="440" r="8" fill="#333"/>
      <path d="M ${width/2 - 15} 460 Q ${width/2} 470 ${width/2 + 15} 460" 
            stroke="#333" stroke-width="2" fill="none"/>
      
      <!-- Status text -->
      <text x="${width/2}" y="550" text-anchor="middle" fill="#888" font-size="12">
        ${isError ? '⚠️ Using fallback image' : '🤖 AI Generated Style Transfer'}
      </text>
    </svg>`;

    const outputPath = `public/uploads/generated_panel_${panelNumber}_${Date.now()}.jpg`;
    
    await sharp(Buffer.from(svgImage))
      .jpeg({ quality: 85 })
      .toFile(outputPath);
    
    return `/${outputPath.replace('public/', '')}`;
    
  } catch (error) {
    console.error('Error creating sample image:', error);
    return `/uploads/placeholder_panel_${panelNumber}.jpg`;
  }
}

// Advanced webtoon style configurations (from nanobananaMCP)
const WEBTOON_STYLES = {
  anime: {
    name: "Anime Style",
    prompt: "anime art style with clean lines, cel shading, and vibrant colors",
    aspectRatio: "9:16"
  },
  digital_art: {
    name: "Digital Art",
    prompt: "high-quality digital art with detailed rendering and professional composition",
    aspectRatio: "9:16"
  },
  sketch: {
    name: "Sketch Style", 
    prompt: "pencil sketch with detailed lineart and shading, webtoon format",
    aspectRatio: "9:16"
  },
  watercolor: {
    name: "Watercolor",
    prompt: "watercolor painting style with soft colors and artistic brushstrokes",
    aspectRatio: "9:16"
  },
  oil_painting: {
    name: "Oil Painting",
    prompt: "oil painting style with rich textures and classical artistic techniques",
    aspectRatio: "9:16"
  }
};

const QUALITY_LEVELS = {
  low: "low quality, quick generation",
  medium: "medium quality, balanced speed and detail",
  high: "high quality, maximum detail and professional finish"
};

const ASPECT_RATIOS = {
  square: "1:1",
  vertical: "9:16", 
  horizontal: "16:9",
  traditional: "4:3"
};

// Enhanced webtoon prompt generator with MCP features
function createAdvancedWebtoonPrompt(options = {}) {
  const {
    storyContent,
    artStyle = 'anime',
    quality = 'high',
    aspectRatio = 'vertical',
    maintainCharacter = false,
    panelNumber = 1,
    totalPanels = 1,
    additionalElements = []
  } = options;

  const styleConfig = WEBTOON_STYLES[artStyle] || WEBTOON_STYLES.anime;
  const qualityConfig = QUALITY_LEVELS[quality] || QUALITY_LEVELS.high;
  const ratio = ASPECT_RATIOS[aspectRatio] || ASPECT_RATIOS.vertical;

  let prompt = `Create a webtoon panel in ${styleConfig.prompt} matching the reference image's artistic style.

Scene Description: ${storyContent}

${totalPanels > 1 ? `This is panel ${panelNumber} of ${totalPanels} in a webtoon sequence.` : ''}

Style Requirements:
- Maintain the exact artistic style, color palette, and visual aesthetics from the reference image
- Apply ${styleConfig.prompt} while preserving the original art style identity
- Aspect ratio: ${ratio} (optimized for webtoon format)
- Quality: ${qualityConfig}
- Professional webtoon composition with proper panel layout`;

  if (maintainCharacter) {
    prompt += `\n- Maintain consistent character design, facial features, and proportions throughout`;
  }

  if (additionalElements.length > 0) {
    prompt += `\n- Additional elements: ${additionalElements.join(', ')}`;
  }

  prompt += `\n\nResult: A single high-quality webtoon panel that seamlessly combines the reference art style with the new scene content.`;

  return prompt;
}

// Image blending function (from nanobananaMCP)
async function blendImagesForWebtoon(imagePaths, blendPrompt, options = {}) {
  const {
    style = 'anime',
    quality = 'high',
    aspectRatio = 'vertical'
  } = options;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image-preview" });
    
    // Load multiple images for blending
    const imageParts = imagePaths.map(path => fileToGenerativePart(path.path, path.mimeType));
    
    const blendingPrompt = `Blend these images to create a cohesive webtoon panel:
    
${blendPrompt}

Style: ${WEBTOON_STYLES[style]?.prompt || 'anime art style'}
Quality: ${QUALITY_LEVELS[quality] || 'high quality'}
Aspect Ratio: ${ASPECT_RATIOS[aspectRatio] || '9:16'}

Create a seamless composition that maintains artistic consistency while combining all visual elements.`;

    const contents = [blendingPrompt, ...imageParts];
    const stream = model.generateContentStream(contents);
    
    return stream;
  } catch (error) {
    console.error('Error in image blending:', error);
    throw error;
  }
}

// Text-to-image generation for character consistency (from nanobananaMCP)
async function generateConsistentCharacter(characterDescription, referenceStyle, options = {}) {
  const {
    style = 'anime',
    quality = 'high',
    poses = ['standing', 'sitting', 'walking']
  } = options;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image-preview" });
    
    const characterPrompt = `Generate a character reference sheet for webtoon creation:

Character: ${characterDescription}
Art Style: ${WEBTOON_STYLES[style]?.prompt || 'anime art style'}
Quality: ${QUALITY_LEVELS[quality] || 'high quality'}

Create multiple views and poses: ${poses.join(', ')}

Requirements:
- Consistent character design across all poses
- Professional webtoon art quality
- Clear character features for reference
- Suitable for Korean webtoon style
- Aspect ratio: 16:9 for character sheet layout`;

    const imagePart = referenceStyle ? fileToGenerativePart(referenceStyle.path, referenceStyle.mimeType) : null;
    const contents = imagePart ? [characterPrompt, imagePart] : [characterPrompt];
    
    const stream = model.generateContentStream(contents);
    return stream;
  } catch (error) {
    console.error('Error generating consistent character:', error);
    throw error;
  }
}

// Helper function to process streaming response from Gemini API
async function processApiStreamResponse(stream, outputPath) {
  let imageGenerated = false;
  let responseText = '';
  
  try {
    // Process the stream response using the proper method
    const response = await stream.response;
    
    // Check if we have image data in the response
    if (response && response.candidates && response.candidates[0]) {
      const candidate = response.candidates[0];
      
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          // Handle text response
          if (part.text) {
            responseText += part.text;
          }
          
          // Handle image response (inline_data)
          if (part.inlineData && part.inlineData.data) {
            console.log('Image data received from nano-banana, saving...');
            const imageBuffer = Buffer.from(part.inlineData.data, 'base64');
            await fs.promises.writeFile(outputPath, imageBuffer);
            imageGenerated = true;
          }
        }
      }
    }
    
    // Try alternative access pattern for nano-banana response
    if (!imageGenerated && response.text) {
      responseText = await response.text();
    }
    
    return { imageGenerated, responseText };
  } catch (error) {
    console.error('Error processing stream response:', error);
    throw error;
  }
}

// Main webtoon generation endpoint (updated for nano-banana streaming API)
app.post('/api/generate-webtoon', upload.single('referenceImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Reference image is required' });
    }

    const { storyContent, maintainCharacter, multiPanel } = req.body;
    
    if (!storyContent || storyContent.trim().length < 10) {
      return res.status(400).json({ error: 'Story content is required and must be at least 10 characters long' });
    }

    console.log('Starting nano-banana webtoon generation...');
    console.log('Reference image:', req.file.filename);
    console.log('Story content:', storyContent);

    // Process the uploaded image
    const referenceImagePath = req.file.path;
    const mimeType = req.file.mimetype;

    // Initialize the model with the exact configuration from Python code
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image-preview" });

    // Determine number of panels
    const shouldCreateMultiple = multiPanel === 'true';
    const numberOfPanels = shouldCreateMultiple ? Math.min(3, Math.max(1, Math.ceil(storyContent.length / 100))) : 1;
    
    const webtoonPanels = [];

    // Generate panels using nano-banana approach
    for (let i = 0; i < numberOfPanels; i++) {
      console.log(`Generating panel ${i + 1}/${numberOfPanels}...`);
      
      // Create specific prompt for this panel
      let panelStoryContent = storyContent;
      if (numberOfPanels > 1) {
        // Split story into panels
        const storySegments = storyContent.split('.').filter(s => s.trim().length > 0);
        const segmentIndex = Math.floor((i * storySegments.length) / numberOfPanels);
        panelStoryContent = storySegments.slice(
          segmentIndex, 
          Math.floor(((i + 1) * storySegments.length) / numberOfPanels)
        ).join('.') + '.';
      }

      // Use advanced prompt generation with MCP features
      const prompt = createAdvancedWebtoonPrompt({
        storyContent: panelStoryContent,
        artStyle: req.body.artStyle || 'anime',
        quality: req.body.quality || 'high',
        aspectRatio: req.body.aspectRatio || 'vertical',
        maintainCharacter: maintainCharacter === 'true',
        panelNumber: i + 1,
        totalPanels: numberOfPanels,
        additionalElements: req.body.additionalElements ? req.body.additionalElements.split(',') : []
      });

      // Convert reference image to the format expected by Gemini (nano-banana format)
      const imagePart = fileToGenerativePart(referenceImagePath, mimeType);

      try {
        // Generate using streaming API like the Python implementation
        console.log('Calling nano-banana streaming API for panel', i + 1);
        
        const contents = [prompt, imagePart];
        
        // Use streaming generation like in Python code
        const stream = model.generateContentStream(contents);
        
        // Output path for generated image
        const timestamp = Date.now();
        const outputPath = `public/uploads/generated_panel_${i + 1}_${timestamp}.jpg`;
        
        // Process streaming response
        const { imageGenerated, responseText } = await processApiStreamResponse(stream, outputPath);
        
        console.log(`Panel ${i + 1} generation completed. Image generated: ${imageGenerated}`);
        
        let finalImageUrl;
        if (imageGenerated) {
          finalImageUrl = `/${outputPath.replace('public/', '')}`;
          console.log('Real image generated successfully!');
        } else {
          // Fallback to sample image if no image was generated
          console.log('No image in response, creating sample...');
          finalImageUrl = await createSampleImage(panelStoryContent, i + 1);
        }
        
        webtoonPanels.push({
          panelNumber: i + 1,
          description: panelStoryContent,
          prompt: prompt,
          imageUrl: finalImageUrl,
          generatedText: responseText,
          imageGenerated: imageGenerated,
          generatedAt: new Date().toISOString()
        });
        
      } catch (apiError) {
        console.error(`Error generating panel ${i + 1}:`, apiError);
        
        // Create a fallback image
        const fallbackImagePath = await createSampleImage(panelStoryContent, i + 1, true);
        
        webtoonPanels.push({
          panelNumber: i + 1,
          description: panelStoryContent,
          prompt: prompt,
          imageUrl: fallbackImagePath,
          error: 'API generation failed, using fallback',
          errorDetails: apiError.message,
          generatedAt: new Date().toISOString()
        });
      }
    }

    // Clean up uploaded file
    try {
      fs.unlinkSync(referenceImagePath);
    } catch (cleanupError) {
      console.warn('Failed to cleanup uploaded file:', cleanupError.message);
    }

    console.log(`Successfully processed ${webtoonPanels.length} webtoon panels`);

    res.json({
      success: true,
      webtoonPanels: webtoonPanels,
      metadata: {
        totalPanels: numberOfPanels,
        maintainCharacter: maintainCharacter === 'true',
        multiPanel: shouldCreateMultiple,
        usingNanoBanana: true,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error generating webtoon:', error);
    
    // Clean up uploaded file in case of error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn('Failed to cleanup uploaded file after error:', cleanupError.message);
      }
    }
    
    res.status(500).json({ 
      error: 'Failed to generate webtoon',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// New API: Image blending for advanced webtoon composition
app.post('/api/blend-images', upload.array('images', 4), async (req, res) => {
  try {
    if (!req.files || req.files.length < 2) {
      return res.status(400).json({ error: 'At least 2 images are required for blending' });
    }

    const { blendPrompt, artStyle, quality, aspectRatio } = req.body;

    if (!blendPrompt || blendPrompt.trim().length < 10) {
      return res.status(400).json({ error: 'Blend prompt is required' });
    }

    console.log('Starting image blending...');
    console.log('Number of images:', req.files.length);
    console.log('Blend prompt:', blendPrompt);

    // Prepare image paths for blending
    const imagePaths = req.files.map(file => ({
      path: file.path,
      mimeType: file.mimetype
    }));

    const blendOptions = {
      style: artStyle || 'anime',
      quality: quality || 'high',
      aspectRatio: aspectRatio || 'vertical'
    };

    // Generate blended image
    const stream = await blendImagesForWebtoon(imagePaths, blendPrompt, blendOptions);
    
    const timestamp = Date.now();
    const outputPath = `public/uploads/blended_image_${timestamp}.jpg`;
    
    const { imageGenerated, responseText } = await processApiStreamResponse(stream, outputPath);
    
    let finalImageUrl;
    if (imageGenerated) {
      finalImageUrl = `/${outputPath.replace('public/', '')}`;
    } else {
      finalImageUrl = await createSampleImage(`Blended: ${blendPrompt}`, 1);
    }

    // Clean up uploaded files
    req.files.forEach(file => {
      try {
        fs.unlinkSync(file.path);
      } catch (err) {
        console.warn('Failed to cleanup file:', err.message);
      }
    });

    res.json({
      success: true,
      blendedImage: {
        imageUrl: finalImageUrl,
        prompt: blendPrompt,
        style: blendOptions.style,
        quality: blendOptions.quality,
        aspectRatio: blendOptions.aspectRatio,
        imageGenerated: imageGenerated,
        responseText: responseText,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error blending images:', error);
    
    // Clean up files on error
    if (req.files) {
      req.files.forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (err) {
          // Ignore cleanup errors
        }
      });
    }
    
    res.status(500).json({
      error: 'Failed to blend images',
      message: error.message
    });
  }
});

// New API: Character reference sheet generation
app.post('/api/generate-character', upload.single('referenceStyle'), async (req, res) => {
  try {
    const { characterDescription, artStyle, quality, poses } = req.body;

    if (!characterDescription || characterDescription.trim().length < 10) {
      return res.status(400).json({ error: 'Character description is required' });
    }

    console.log('Starting character generation...');
    console.log('Character:', characterDescription);

    const referenceStyle = req.file ? {
      path: req.file.path,
      mimeType: req.file.mimetype
    } : null;

    const characterOptions = {
      style: artStyle || 'anime',
      quality: quality || 'high',
      poses: poses ? poses.split(',').map(p => p.trim()) : ['standing', 'sitting', 'walking']
    };

    const stream = await generateConsistentCharacter(characterDescription, referenceStyle, characterOptions);
    
    const timestamp = Date.now();
    const outputPath = `public/uploads/character_sheet_${timestamp}.jpg`;
    
    const { imageGenerated, responseText } = await processApiStreamResponse(stream, outputPath);
    
    let finalImageUrl;
    if (imageGenerated) {
      finalImageUrl = `/${outputPath.replace('public/', '')}`;
    } else {
      finalImageUrl = await createSampleImage(`Character: ${characterDescription}`, 1);
    }

    // Clean up reference file if uploaded
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.warn('Failed to cleanup reference file:', err.message);
      }
    }

    res.json({
      success: true,
      characterSheet: {
        imageUrl: finalImageUrl,
        characterDescription: characterDescription,
        style: characterOptions.style,
        quality: characterOptions.quality,
        poses: characterOptions.poses,
        imageGenerated: imageGenerated,
        responseText: responseText,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error generating character:', error);
    
    // Clean up file on error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        // Ignore cleanup errors
      }
    }
    
    res.status(500).json({
      error: 'Failed to generate character',
      message: error.message
    });
  }
});

// API: Get available styles and options
app.get('/api/styles', (req, res) => {
  res.json({
    styles: WEBTOON_STYLES,
    qualityLevels: QUALITY_LEVELS,
    aspectRatios: ASPECT_RATIOS
  });
});

// Endpoint to get generation status (for future use with async generation)
app.get('/api/generation-status/:jobId', async (req, res) => {
  const { jobId } = req.params;
  // This would track generation progress in a real implementation
  res.json({
    jobId,
    status: 'completed',
    progress: 100,
    message: 'Generation completed successfully'
  });
});

// Start the server
if (require.main === module) {
  // Check if we should run as Express server (default) or MCP server
  const runMode = process.env.RUN_MODE || 'express';
  
  if (runMode === 'mcp') {
    // Run as MCP server
    const transport = new StdioServerTransport();
    server.connect(transport);
    console.log('MCP Server started on stdio');
  } else {
    // Run as Express server (default)
    app.listen(PORT, () => {
      console.log(`🚀 인스타툰 서버가 포트 ${PORT}에서 실행 중입니다!`);
      console.log(`📱 웹 인터페이스: http://localhost:${PORT}`);
      console.log(`🔧 API 엔드포인트: http://localhost:${PORT}/api/`);
      console.log('------------------------------------');
    });
  }
}

module.exports = { server, app };