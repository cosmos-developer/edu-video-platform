import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface GenerateQuestionsRequest {
  videoTitle: string
  videoDescription?: string
  content: string
  questionCount?: number
  questionTypes?: ('MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER')[]
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD'
  provider?: 'OPENAI' | 'CLAUDE'
}

interface GeneratedQuestion {
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER'
  question: string
  options?: string[]
  correctAnswer: string
  explanation?: string
  suggestedTimestamp?: number
}

interface AIResponse {
  questions: GeneratedQuestion[]
  milestoneTitle: string
  milestoneDescription?: string
}

export class AIQuestionService {
  private static openai: OpenAI | null = null
  private static anthropic: Anthropic | null = null

  static initialize() {
    // Initialize OpenAI if API key is available
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      })
    }

    // Initialize Claude if API key is available
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      })
    }
  }

  static async generateQuestions(request: GenerateQuestionsRequest): Promise<AIResponse> {
    const provider = request.provider || this.getPreferredProvider()
    
    switch (provider) {
      case 'OPENAI':
        return this.generateWithOpenAI(request)
      case 'CLAUDE':
        return this.generateWithClaude(request)
      default:
        throw new Error('No AI provider available. Please configure OPENAI_API_KEY or ANTHROPIC_API_KEY.')
    }
  }

  private static getPreferredProvider(): 'OPENAI' | 'CLAUDE' {
    if (this.openai) return 'OPENAI'
    if (this.anthropic) return 'CLAUDE'
    throw new Error('No AI provider configured')
  }

  private static buildPrompt(request: GenerateQuestionsRequest): string {
    const questionTypes = request.questionTypes || ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER']
    const questionCount = request.questionCount || 3
    const difficulty = request.difficulty || 'MEDIUM'

    return `
You are an expert educational content creator. Based on the video content provided, generate ${questionCount} high-quality interactive questions for students.

Video Information:
- Title: ${request.videoTitle}
- Description: ${request.videoDescription || 'Not provided'}
- Content/Transcript: ${request.content}

Requirements:
1. Generate exactly ${questionCount} questions
2. Question types to include: ${questionTypes.join(', ')}
3. Difficulty level: ${difficulty}
4. Questions should test comprehension, not just recall
5. Each question should be clear and unambiguous
6. For multiple choice, provide 4 options with only one correct answer
7. Include brief explanations for correct answers
8. Suggest appropriate timestamps (in seconds) where these questions might appear in the video

Response format (JSON only):
{
  "milestoneTitle": "Interactive Quiz: [Topic Name]",
  "milestoneDescription": "Brief description of what this milestone covers",
  "questions": [
    {
      "type": "MULTIPLE_CHOICE",
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option B",
      "explanation": "Brief explanation of why this is correct",
      "suggestedTimestamp": 120
    },
    {
      "type": "TRUE_FALSE",
      "question": "True or false statement?",
      "correctAnswer": "True",
      "explanation": "Explanation here",
      "suggestedTimestamp": 240
    },
    {
      "type": "SHORT_ANSWER",
      "question": "What is the main concept?",
      "correctAnswer": "The main concept",
      "explanation": "Why this answer is correct",
      "suggestedTimestamp": 360
    }
  ]
}

Important: Return only valid JSON. No additional text or markdown formatting.
`
  }

  private static async generateWithOpenAI(request: GenerateQuestionsRequest): Promise<AIResponse> {
    if (!this.openai) {
      throw new Error('OpenAI not initialized')
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert educational content creator. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: this.buildPrompt(request)
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })

      const content = completion.choices[0]?.message?.content
      if (!content) {
        throw new Error('No response from OpenAI')
      }

      return this.parseAIResponse(content)
    } catch (error) {
      console.error('OpenAI API error:', error)
      throw new Error('Failed to generate questions with OpenAI')
    }
  }

  private static async generateWithClaude(request: GenerateQuestionsRequest): Promise<AIResponse> {
    if (!this.anthropic) {
      throw new Error('Claude not initialized')
    }

    try {
      const message = await this.anthropic.messages.create({
        model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
        max_tokens: 2000,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: this.buildPrompt(request)
          }
        ]
      })

      const content = message.content[0]?.type === 'text' ? message.content[0].text : ''
      if (!content) {
        throw new Error('No response from Claude')
      }

      return this.parseAIResponse(content)
    } catch (error) {
      console.error('Claude API error:', error)
      throw new Error('Failed to generate questions with Claude')
    }
  }

  private static parseAIResponse(content: string): AIResponse {
    try {
      // Clean up the response to ensure it's valid JSON
      let cleanContent = content.trim()
      
      // Remove markdown code blocks if present
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }

      const parsed = JSON.parse(cleanContent)
      
      // Validate the structure
      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error('Invalid response structure: questions array missing')
      }

      // Validate each question
      for (const question of parsed.questions) {
        if (!question.type || !question.question || !question.correctAnswer) {
          throw new Error('Invalid question structure')
        }
        
        if (question.type === 'MULTIPLE_CHOICE' && (!question.options || question.options.length < 2)) {
          throw new Error('Multiple choice questions must have at least 2 options')
        }
      }

      return {
        milestoneTitle: parsed.milestoneTitle || 'Interactive Quiz',
        milestoneDescription: parsed.milestoneDescription,
        questions: parsed.questions
      }
    } catch (error) {
      console.error('Failed to parse AI response:', error)
      console.error('Raw content:', content)
      throw new Error('Invalid response format from AI provider')
    }
  }

  // Generate questions for existing milestone
  static async generateQuestionsForMilestone(
    milestoneId: string,
    request: Omit<GenerateQuestionsRequest, 'content'> & { content?: string }
  ): Promise<void> {
    // Get milestone details
    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: {
        video: {
          include: {
            videoGroup: true
          }
        }
      }
    })

    if (!milestone) {
      throw new Error('Milestone not found')
    }

    // If no content provided, use video title/description
    const content = request.content || `
      Video: ${milestone.video.title}
      Description: ${milestone.video.description || ''}
      Lesson: ${milestone.video.videoGroup.title}
      Lesson Description: ${milestone.video.videoGroup.description || ''}
      
      Please generate questions appropriate for the milestone "${milestone.title}" at ${milestone.timestamp} seconds.
    `

    const generatedContent = await this.generateQuestions({
      ...request,
      videoTitle: milestone.video.title,
      videoDescription: milestone.video.description || undefined,
      content
    })

    // Create questions in the database
    for (const questionData of generatedContent.questions) {
      const question = await prisma.question.create({
        data: {
          milestoneId,
          type: questionData.type,
          text: questionData.question,
          questionData: {
            correctAnswer: questionData.correctAnswer,
            options: questionData.options || []
          },
          explanation: questionData.explanation || null
        }
      })

      // Create options for multiple choice questions
      if (questionData.type === 'MULTIPLE_CHOICE' && questionData.options) {
        const optionData = questionData.options.map((optionText, index) => ({
          questionId: question.id,
          text: optionText,
          isCorrect: optionText === questionData.correctAnswer,
          order: index + 1
        }))

        await prisma.questionOption.createMany({
          data: optionData
        })
      }
    }
  }

  // Generate milestone and questions from content
  static async generateMilestoneWithQuestions(
    videoId: string,
    request: GenerateQuestionsRequest
  ): Promise<{ milestoneId: string; questionCount: number }> {
    const generatedContent = await this.generateQuestions(request)

    // Create milestone
    const suggestedTimestamp = generatedContent.questions[0]?.suggestedTimestamp || 60
    
    const milestone = await prisma.milestone.create({
      data: {
        videoId,
        timestamp: suggestedTimestamp,
        title: generatedContent.milestoneTitle,
        description: generatedContent.milestoneDescription || null,
        type: 'QUIZ',
        order: 0 // Default order, should be updated based on existing milestones
      }
    })

    // Create questions
    let questionCount = 0
    for (const questionData of generatedContent.questions) {
      const question = await prisma.question.create({
        data: {
          milestoneId: milestone.id,
          type: questionData.type,
          text: questionData.question,
          questionData: {
            correctAnswer: questionData.correctAnswer,
            options: questionData.options || []
          },
          explanation: questionData.explanation || null
        }
      })

      // Create options for multiple choice questions
      if (questionData.type === 'MULTIPLE_CHOICE' && questionData.options) {
        const optionData = questionData.options.map((optionText, index) => ({
          questionId: question.id,
          text: optionText,
          isCorrect: optionText === questionData.correctAnswer,
          order: index + 1
        }))

        await prisma.questionOption.createMany({
          data: optionData
        })
      }

      questionCount++
    }

    return {
      milestoneId: milestone.id,
      questionCount
    }
  }

  static getAvailableProviders(): string[] {
    const providers: string[] = []
    if (this.openai) providers.push('OPENAI')
    if (this.anthropic) providers.push('CLAUDE')
    return providers
  }
}

// Initialize the service
AIQuestionService.initialize()