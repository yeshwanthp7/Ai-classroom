import { NextResponse } from 'next/server'

console.log('PEXELS KEY EXISTS:', !!process.env.PEXELS_API_KEY)

function generateMockStudyGuide(promptText: string): string {
  // 1. Try to extract the document text from the prompt
  let documentText = "";
  const startSeparator = "Please analyze this study material:\n---";
  const endSeparator = "---";
  const startIdx = promptText.indexOf(startSeparator);
  if (startIdx !== -1) {
    const endIdx = promptText.indexOf(endSeparator, startIdx + startSeparator.length);
    if (endIdx !== -1) {
      documentText = promptText.slice(startIdx + startSeparator.length, endIdx).trim();
    }
  }
  
  if (!documentText) {
    documentText = promptText.slice(0, 4000); // fallback
  }

  // 2. Extract title/topic of document
  let docTopic = "Uploaded Study Material";
  const nameMatch = promptText.match(/(?:document|file|material)\s+["']([^"']+)["']/i) || promptText.match(/Name:\s*([^\n\r]+)/i);
  if (nameMatch && nameMatch[1]) {
    docTopic = nameMatch[1].replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
  }

  // Split into sentences
  const sentences = documentText
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 25 && s.length < 250 && !s.includes('Document Metadata:') && !s.includes('Structured JSON response'));

  // If we have actual sentences from the document, let's build a dynamic, proper summary
  if (sentences.length >= 3) {
    // Filter out stop words and find key terms
    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'but', 'or', 'for', 'with', 'about', 'to', 'in', 'of', 'that', 'this',
      'these', 'those', 'it', 'its', 'they', 'them', 'their', 'we', 'us', 'our', 'you', 'your', 'he', 'him', 'his', 'she', 'her',
      'was', 'were', 'been', 'be', 'are', 'am', 'have', 'has', 'had', 'do', 'does', 'did', 'can', 'could', 'will', 'would',
      'should', 'shall', 'may', 'might', 'must', 'there', 'here', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each',
      'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
      's', 't', 'just', 'now', 'please', 'analyze', 'study', 'material', 'generate', 'structured', 'response'
    ]);

    const wordCounts: Record<string, number> = {};
    sentences.forEach(sentence => {
      const words = sentence.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
      words.forEach(word => {
        if (word.length > 4 && !stopWords.has(word)) {
          wordCounts[word] = (wordCounts[word] || 0) + 1;
        }
      });
    });

    const sortedWords = Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);

    const keyConcepts: Array<{ concept: string; description: string; imageKeyword: string }> = [];

    // Dictionary of common terms and their premium definitions
    const DICTIONARY: Record<string, string> = {
      photosynthesis: "Photosynthesis is the chemical process by which green plants and some other organisms convert light energy (sunlight) into chemical energy (glucose) using water and carbon dioxide.",
      mitosis: "Mitosis is a type of cell division that results in two daughter cells each having the same number and kind of chromosomes as the parent nucleus, typical of ordinary tissue growth.",
      cell: "A cell is the smallest structural and functional unit of an organism, typically microscopic and containing cytoplasm and a nucleus in eukaryotes.",
      quantum: "Quantum mechanics is the branch of physics relating to the very small, describing wave-particle duality and the probabilistic behaviors of subatomic particles.",
      mechanics: "Mechanics is the branch of applied mathematics and physics concerned with the motion of physical bodies and the forces acting upon them.",
      equation: "An equation is a mathematical statement asserting the equality of two expressions, widely used to model rates of change, forces, and physical laws.",
      derivative: "A derivative is the instantaneous rate of change of a function, representing the exact slope of the tangent line on a curve at any given point.",
      integral: "An integral is a mathematical object representing the accumulation of quantities, corresponding to the area under the curve of a function graph.",
      html: "HTML (Hypertext Markup Language) is the standard markup language used to structure web pages and define elements like headers, text, forms, and links.",
      css: "CSS (Cascading Style Sheets) is a stylesheet language used to describe the presentation, layout, colors, and responsive formatting of HTML documents.",
      javascript: "JavaScript is a high-level, dynamic programming language that enables interactive client-side behaviors, event handling, and DOM manipulation in web browsers.",
      programming: "Programming is the process of writing, testing, debugging, and maintaining the source code of computer programs to execute specific logical tasks.",
      revolution: "A revolution is a forcible overthrow of a government or social order, in favor of a new system, as exemplified by the French Revolution of 1789.",
      history: "History is the study of past events, particularly in human affairs, analyzing causes, timelines, and long-term socio-political consequences.",
      energy: "Energy is the quantitative physical property that must be transferred to a body or system to perform work on it or to heat it, existing in potential and kinetic forms."
    };

    // Grab up to 3 concepts
    for (const word of sortedWords) {
      if (keyConcepts.length >= 3) break;

      const capitalizedConcept = word.charAt(0).toUpperCase() + word.slice(1);
      
      // Determine premium description
      let description = "";
      if (DICTIONARY[word]) {
        description = `${DICTIONARY[word]} The uploaded text discusses this in detail, emphasizing its role and interactions.`;
      } else {
        // Construct smart, proper dynamic definition using sentences from text
        const relatedSentence = sentences.find(s => s.toLowerCase().includes(word)) || sentences[0];
        description = `${capitalizedConcept} represents a central topic in these notes. Specifically, it involves the processes and details described here: "${relatedSentence}". Understanding this is crucial for mastering the topic.`;
      }

      keyConcepts.push({
        concept: capitalizedConcept,
        description: description,
        imageKeyword: word
      });
    }

    // Fill in default concepts if we didn't find enough
    while (keyConcepts.length < 3) {
      const idx = keyConcepts.length;
      const fallbackWord = sortedWords[idx] || "study";
      const capitalized = fallbackWord.charAt(0).toUpperCase() + fallbackWord.slice(1);
      keyConcepts.push({
        concept: capitalized,
        description: `This section covers ${capitalized} as a core topic. It plays a significant role in the overall framework explained in the study material.`,
        imageKeyword: fallbackWord
      });
    }

    // Construct a premium summary
    const summary = `This document provides a structured guide to ${docTopic}, covering its main principles: ${keyConcepts.map(c => c.concept).join(", ")}.`;

    // Construct detailed shortcut lectures
    const details = `### Core Principles of ${docTopic}
Here is a shortcut explanation of the primary concepts:

1. **${keyConcepts[0].concept}**: ${keyConcepts[0].description}
2. **${keyConcepts[1].concept}**: ${keyConcepts[1].description}
3. **${keyConcepts[2].concept}**: ${keyConcepts[2].description}

### Detailed Analysis & Shortcut Guide
The uploaded notes explain how these topics interconnect. When preparing for this lesson, focus on:
* **Fundamental Definitions**: Make sure you can define each of the core concepts above.
* **Practical Applications**: Review the examples and formulas mentioned in the notes to see how these theories are put into practice.
* **Key Connections**: Understand the relationship between ${keyConcepts[0].concept.toLowerCase()} and ${keyConcepts[1].concept.toLowerCase()} as described in the text.

Use the Doubt Chat panel on the right if you need a deeper explanation of any specific section or formula!`;

    return JSON.stringify({
      summary,
      keyConcepts,
      details
    });
  }

  // If document text is empty or too short, return the standard structured mock templates
  const textLower = promptText.toLowerCase();
  
  if (textLower.includes('cell') || textLower.includes('biology') || textLower.includes('mitosis') || textLower.includes('organelle') || textLower.includes('photosynthesis')) {
    return JSON.stringify({
      summary: "An overview of cellular biology, detailing cellular structure, organelles, energy processes, and cell division.",
      keyConcepts: [
        {
          concept: "Cell Membrane & Wall",
          description: "The cell membrane acts as a selective barrier regulating entry and exit, while the cell wall in plant cells provides mechanical support and protection.",
          imageKeyword: "microscope cell structure"
        },
        {
          concept: "Mitochondria: Energy Generation",
          description: "Mitochondria act as the cell powerhouses, performing cellular respiration to generate adenosine triphosphate (ATP) as chemical energy.",
          imageKeyword: "mitochondria cell biology"
        },
        {
          concept: "Photosynthesis in Chloroplasts",
          description: "Plants convert light energy, carbon dioxide, and water into chemical energy (glucose) and release oxygen inside chloroplast organelles.",
          imageKeyword: "green leaf sunlight photosynthesis"
        }
      ],
      details: "Cells are the fundamental building blocks of all living organisms. They can be broadly classified into eukaryotic cells (possessing a true nucleus) and prokaryotic cells (lacking a nucleus).\n\nVarious intracellular organelles perform specialized duties. The nucleus holds genetic instruction manuals (DNA), ribosomes synthesize proteins, lysosomes digest cellular waste, and the endoplasmic reticulum processes macromolecules.\n\nEnergy transformation processes, like photosynthesis in plant chloroplasts and cellular respiration in animal mitochondria, power the biological engines of all life forms on Earth."
    });
  }

  if (textLower.includes('quantum') || textLower.includes('physics') || textLower.includes('atom') || textLower.includes('electron') || textLower.includes('mechanics')) {
    return JSON.stringify({
      summary: "An introduction to quantum physics, detailing subatomic phenomena, quantum states, and wave-particle duality.",
      keyConcepts: [
        {
          concept: "Wave-Particle Duality",
          description: "Subatomic particles, such as photons and electrons, exhibit both particle-like collisions and wave-like diffraction patterns.",
          imageKeyword: "physics prism light laser"
        },
        {
          concept: "Quantum Superposition",
          description: "Quantum systems remain in a linear combination of multiple possible physical states until an observation collapses it into one state.",
          imageKeyword: "quantum computing physics laser"
        },
        {
          concept: "Heisenberg Uncertainty Principle",
          description: "A fundamental physics limit asserting that the exact position and momentum of a particle cannot be measured simultaneously with absolute precision.",
          imageKeyword: "blackboard mathematics physics equations"
        }
      ],
      details: "Quantum mechanics is a fundamental theory in physics that describes the physical properties of nature at the atomic and subatomic scales, where classical physics ceases to be accurate.\n\nUnlike classical physics, quantum physics is fundamentally probabilistic. Superposition allows a qubit to be both 0 and 1 simultaneously, while quantum entanglement links particles instantly across distances.\n\nThese quantum concepts have enabled modern technologies, including lasers, transistors, microchips, superconductors, and the emergence of quantum computers."
    });
  }

  if (textLower.includes('html') || textLower.includes('css') || textLower.includes('javascript') || textLower.includes('web') || textLower.includes('react') || textLower.includes('coding') || textLower.includes('programming')) {
    return JSON.stringify({
      summary: "A practical guide to modern web development, explaining page structure, CSS layouts, and JavaScript interactivity.",
      keyConcepts: [
        {
          concept: "HTML5 Semantic Structure",
          description: "HTML provides structural page content. Semantic tags (header, main, section, footer) enhance layout readability, SEO, and browser accessibility.",
          imageKeyword: "html code laptop screen"
        },
        {
          concept: "CSS Box Model & Flexbox",
          description: "CSS styles layouts. The Box Model controls dimensions (margins, borders, padding), while Flexbox enables fluid responsive alignment.",
          imageKeyword: "web layout css design UI"
        },
        {
          concept: "JavaScript DOM Manipulation",
          description: "JavaScript adds logic. It lets developers capture user actions (clicks, keypresses) and update structural elements dynamically.",
          imageKeyword: "javascript coding developer"
        }
      ],
      details: "Frontend web development centers on constructing visual, interactive user interfaces that run natively inside modern web browsers.\n\nHTML5 frames the text, images, forms, and multimedia content. CSS3 enhances visual styling, fonts, and responsive grid layouts, adapting smoothly to mobile, tablet, and desktop viewports.\n\nJavaScript transforms static documents into reactive web apps. By listening to browser events, querying API endpoints, and editing the Document Object Model (DOM) dynamically, it enables rich interactions."
    });
  }

  // Default Generic Fallback
  return JSON.stringify({
    summary: `AI study guide summarizing key concepts within the uploaded files regarding ${docTopic}.`,
    keyConcepts: [
      {
        concept: `${docTopic} Core Concepts`,
        description: "Understanding the primary terminologies, structural frameworks, and key theories detailed in these notes.",
        imageKeyword: "study notes pencil textbook"
      },
      {
        concept: "Practical Application & Examples",
        description: "Reviewing how these ideas and formulas apply directly to solving exercises and real-world scenarios.",
        imageKeyword: "laptop coding brainstorming ideas"
      },
      {
        concept: "Review & Key Takeaways",
        description: "Focusing on exam-relevant summaries, critical dates, and condensed outlines to maximize revision efficiency.",
        imageKeyword: "library bookshelf university education"
      }
    ],
    details: `This study workspace is designed to help you quickly understand the primary concepts in your uploaded document regarding ${docTopic}.\n\nBy organizing the notes into structured key concepts, you can optimize your revision sessions. Focus on defining each concept, review the concept images, and prepare using the doubt chat.\n\nWe recommend using the interactive chat on the right to clear up specific paragraphs, formulas, or historical events mentioned in the notes.`
  });
}

function generateMockQA(prompt: string): string {
  const doubtMatch = prompt.match(/doubt:\s*["']?([^"'\r\n]+)["']?/i) || prompt.match(/doubt\s+is:\s*["']?([^"'\r\n]+)["']?/i);
  const doubt = doubtMatch ? doubtMatch[1].trim() : "this concept";
  const doubtLower = doubt.toLowerCase();

  // Try to extract document text context from prompt
  let documentText = "";
  const startSeparator = "Document content (extracted):\n---";
  const endSeparator = "---";
  const startIdx = prompt.indexOf(startSeparator);
  if (startIdx !== -1) {
    const endIdx = prompt.indexOf(endSeparator, startIdx + startSeparator.length);
    if (endIdx !== -1) {
      documentText = prompt.slice(startIdx + startSeparator.length, endIdx).trim();
    }
  }

  if (documentText) {
    const sentences = documentText
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 10);
    
    // Find a sentence that matches the doubt
    const matchedSentences = sentences.filter(s => {
      const words = doubtLower.split(/\s+/).filter(w => w.length > 3);
      return words.some(w => s.toLowerCase().includes(w));
    });

    if (matchedSentences.length > 0) {
      return `Based on your study notes, here is what is explained: "${matchedSentences[0]}." This directly covers your question about "${doubt}". Let me know if you would like me to expand on this!`;
    }
  }

  if (doubtLower.includes('how') || doubtLower.includes('what') || doubtLower.includes('why') || doubtLower.includes('explain')) {
    return `Great question! In the context of your uploaded study material, "${doubt}" is a key concept. It represents a fundamental principle that explains the behaviors described in the document. To understand it better, we suggest reviewing the corresponding key concepts on the left. Let me know if you would like a deeper explanation of this specific part!`;
  }
  
  return `To clarify your doubt about "${doubt}": in this study guide, this refers to the core properties and definitions outlined in the material. It connects directly to the main themes of the lesson. Let me know if you have any other questions about this topic!`;
}

export async function POST(req: Request) {
  console.log('=== GROQ ROUTE CALLED ===')
  
  const { prompt, system } = await req.json()
  
  const hasKey = process.env.GROQ_API_KEY && 
                 process.env.GROQ_API_KEY !== 'your-api-key' && 
                 process.env.GROQ_API_KEY !== 'your_groq_api_key' &&
                 !process.env.GROQ_API_KEY.includes('dummy');

  if (!hasKey) {
    console.warn('Groq API Key is not set or is dummy. Generating simulated AI response.');
    // Determine whether it is a doubt chat or structured guide request
    const isGuideRequest = prompt.includes('structured JSON response') || prompt.includes('keyConcepts');
    const responseText = isGuideRequest ? generateMockStudyGuide(prompt) : generateMockQA(prompt);
    
    // Simulate minor delay for realistic loading feel
    await new Promise((resolve) => setTimeout(resolve, 800));
    return NextResponse.json({ text: responseText });
  }

  try {
    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: prompt }
          ],
          max_tokens: 2048,
          temperature: 0.7
        })
      }
    )
    
    if (!response.ok) {
      throw new Error(`Groq API returned status ${response.status}`);
    }

    const data = await response.json()
    console.log('Groq status:', response.status)
    
    const text = data.choices?.[0]?.message?.content
    
    if (!text) {
      throw new Error('Groq returned empty text content');
    }
    
    return NextResponse.json({ text })
  } catch (error) {
    console.error('Groq fetch failed, falling back to mock generator:', error);
    const isGuideRequest = prompt.includes('structured JSON response') || prompt.includes('keyConcepts');
    const responseText = isGuideRequest ? generateMockStudyGuide(prompt) : generateMockQA(prompt);
    return NextResponse.json({ text: responseText });
  }
}


