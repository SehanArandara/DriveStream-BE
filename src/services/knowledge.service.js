/**
 * DriveStream Knowledge Service
 * 
 * Loads PDF documents from the /knowledge directory at startup
 * and provides the extracted text as context for the AI chatbot.
 */
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

const KNOWLEDGE_DIR = path.join(__dirname, '..', 'knowledge');

let knowledgeBase = '';
let isLoaded = false;

/**
 * Load all PDF files from the knowledge directory.
 * Called once at server startup.
 */
const loadKnowledge = async () => {
  try {
    if (!fs.existsSync(KNOWLEDGE_DIR)) {
      fs.mkdirSync(KNOWLEDGE_DIR, { recursive: true });
      console.log('📂 Knowledge directory created. Add PDFs to:', KNOWLEDGE_DIR);
      return;
    }

    const files = fs.readdirSync(KNOWLEDGE_DIR).filter(f => 
      f.toLowerCase().endsWith('.pdf') || 
      f.toLowerCase().endsWith('.md') || 
      f.toLowerCase().endsWith('.txt')
    );

    if (files.length === 0) {
      console.log('📂 No knowledge files found in knowledge directory. Using default knowledge base.');
      return;
    }

    const chunks = [];

    for (const file of files) {
      const filePath = path.join(KNOWLEDGE_DIR, file);
      const dataBuffer = fs.readFileSync(filePath);
      
      let textContent = '';

      if (file.toLowerCase().endsWith('.pdf')) {
        const pdfData = await pdfParse(dataBuffer);
        textContent = pdfData.text;
        console.log(`📄 Loaded PDF: ${file} (${pdfData.numpages} pages, ${textContent.length} chars)`);
      } else {
        textContent = dataBuffer.toString('utf8');
        console.log(`📄 Loaded Text/MD: ${file} (${textContent.length} chars)`);
      }
      
      chunks.push(`\n--- Document: ${file} ---\n${textContent}\n`);
    }

    knowledgeBase = chunks.join('\n');
    isLoaded = true;
    console.log(`✅ Knowledge base loaded: ${files.length} PDF(s), ${knowledgeBase.length} total characters.`);
  } catch (err) {
    console.error('❌ Failed to load knowledge base:', err.message);
  }
};

/**
 * Get the loaded knowledge base text.
 * Returns the PDF content or empty string if none loaded.
 */
const getKnowledge = () => knowledgeBase;

/**
 * Check if any PDF knowledge has been loaded.
 */
const hasKnowledge = () => isLoaded && knowledgeBase.length > 0;

module.exports = { loadKnowledge, getKnowledge, hasKnowledge };
