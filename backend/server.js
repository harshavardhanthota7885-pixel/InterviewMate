require('dotenv').config()

const express = require('express')
const cors = require('cors')
const { GoogleGenAI } = require('@google/genai')

const app = express()

app.use(
  cors({
    origin: 'http://localhost:5173',
  })
)

app.use(express.json())

const PORT = 5000

// Initialize Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    retryOptions: {
      attempts: 1,
    },
  },
})

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function generateContentWithRetry(request) {
  const maxAttempts = 3

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const attemptStartTime = Date.now()

try {
  const response = await ai.models.generateContent(request)

  console.log(
    `Gemini attempt ${attempt} succeeded in ${(Date.now() - attemptStartTime) / 1000} seconds`
  )

  return response
} catch (error) {
  console.log(
    `Gemini attempt ${attempt} failed after ${(Date.now() - attemptStartTime) / 1000} seconds`
  )

  throw error
}
    } catch (error) {
      console.error('Gemini error details:', {
  name: error.name,
  message: error.message,
  status: error.status,
  code: error.code,
  cause: error.cause
    ? {
        name: error.cause.name,
        message: error.cause.message,
        code: error.cause.code,
      }
    : undefined,
})
      const errorMessage = String(error.message || '')
      const errorStatus = Number(error.status || error.code)

      const isTemporaryError =
        errorStatus === 429 ||
        errorStatus === 503 ||
        errorMessage.includes('429') ||
        errorMessage.includes('503') ||
        errorMessage.includes('UNAVAILABLE') ||
        errorMessage.includes('RESOURCE_EXHAUSTED')

      if (!isTemporaryError || attempt === maxAttempts) {
        throw error
      }

      const delay = 1000 * 2 ** (attempt - 1)

      console.log(
        `Gemini temporarily unavailable. Retrying in ${delay / 1000}s (attempt ${attempt + 1}/${maxAttempts})...`
      )

      await sleep(delay)
    }
  }
}


// Home route
app.get('/', (req, res) => {
  res.json({
    message: 'InterviewMate backend is running!',
    status: 'success',
  })
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'InterviewMate API is healthy!',
  })
})

// Test Gemini connection
app.get('/api/gemini-test', async (req, res) => {
  try {
    const startTime = Date.now()

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents:
        'Reply with exactly: InterviewMate Gemini connection successful!',
    })
    console.log(
  `Gemini simple test took ${(Date.now() - startTime) / 1000} seconds`
)

    res.json({
      success: true,
      message: response.text,
    })
  } catch (error) {
    console.error('Gemini test failed:', error.message)

    res.status(500).json({
      success: false,
      message: 'Gemini connection failed. Check the backend terminal.',
    })
  }
})

// Validate interview configuration
app.post('/api/interview/config', (req, res) => {
  const { role, difficulty, techStack, questionCount } = req.body

  if (!role || !difficulty || !techStack || questionCount === undefined) {
    return res.status(400).json({
      success: false,
      message: 'Please provide all interview configuration fields.',
    })
  }

  if (![5, 10, 15].includes(questionCount)) {
    return res.status(400).json({
      success: false,
      message: 'Question count must be 5, 10, or 15.',
    })
  }

  if (
    typeof role !== 'string' ||
    typeof difficulty !== 'string' ||
    typeof techStack !== 'string' ||
    !role.trim() ||
    !difficulty.trim() ||
    !techStack.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: 'Role, difficulty, and tech stack must be valid text.',
    })
  }

  return res.json({
    success: true,
    message: 'Interview configuration received!',
    config: {
      role: role.trim(),
      difficulty: difficulty.trim(),
      techStack: techStack.trim(),
      questionCount,
    },
  })
})

// Generate interview questions using Gemini
app.post('/api/interview/questions', async (req, res) => {
  const { role, difficulty, techStack, questionCount } = req.body

  console.log('Received interview config:', {
  role,
  difficulty,
  techStack,
  questionCount,
}) 

  // Validate required fields
  if (
    typeof role !== 'string' ||
    typeof difficulty !== 'string' ||
    typeof techStack !== 'string' ||
    !role.trim() ||
    !difficulty.trim() ||
    !techStack.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: 'Role, difficulty, and tech stack are required.',
    })
  }

  // Validate question count
  if (![5, 10, 15].includes(questionCount)) {
    return res.status(400).json({
      success: false,
      message: 'Question count must be 5, 10, or 15.',
    })
  }

  try {
    const prompt = `
You are an expert technical interviewer.

Generate exactly ${questionCount} interview questions for these settings:
- Role: ${role.trim()}
- Difficulty: ${difficulty.trim()}
- Technology stack: ${techStack.trim()}

Requirements:
- Make every question relevant to the selected technology stack and role.
- Match the requested difficulty.
- Avoid duplicate questions.
- Return only a valid JSON array of strings.
- Do not include Markdown formatting or explanations.

Example format:
["Question 1?", "Question 2?"]
`
const startTime = Date.now()
    const response = await generateContentWithRetry({
  model: 'gemini-3.6-flash',
  contents: prompt,
  config: {
  responseMimeType: 'application/json',
  thinkingConfig: {
    thinkingLevel: 'low',
  },
},
})
console.log(
  `Gemini question generation took ${(Date.now() - startTime) / 1000} seconds`
)

    const generatedText = response.text

    if (!generatedText) {
      throw new Error('Gemini returned an empty response.')
    }

    let questions

    try {
      questions = JSON.parse(generatedText)
    } catch {
      throw new Error('Gemini returned invalid JSON.')
    }

    // Validate Gemini's output
    if (
      !Array.isArray(questions) ||
      questions.length !== questionCount ||
      !questions.every(
        (question) =>
          typeof question === 'string' && question.trim().length > 0
      )
    ) {
      throw new Error('Gemini returned an invalid question list.')
    }

    // Return questions in the format expected by React
    return res.json({
      success: true,
      message: 'Interview questions generated successfully.',
      config: {
        role: role.trim(),
        difficulty: difficulty.trim(),
        techStack: techStack.trim(),
        questionCount,
      },
      questions: questions.map((question) => question.trim()),
    })
  } catch (error) {
    console.error('Question generation failed:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Unable to generate interview questions. Please try again.',
    })
  }
})

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
