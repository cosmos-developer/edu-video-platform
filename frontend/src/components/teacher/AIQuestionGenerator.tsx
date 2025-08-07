import React, { useState, useEffect } from 'react'
import { aiService } from '../../services/ai'
import type { GenerateQuestionsRequest, GeneratedQuestion } from '../../services/ai'
import type { Video, Milestone } from '../../services/video'

interface AIQuestionGeneratorProps {
  video: Video
  milestone?: Milestone
  onQuestionsGenerated: () => void
  onClose: () => void
}

export function AIQuestionGenerator({ 
  video, 
  milestone, 
  onQuestionsGenerated, 
  onClose 
}: AIQuestionGeneratorProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availableProviders, setAvailableProviders] = useState<string[]>([])
  const [hasAISupport, setHasAISupport] = useState(false)
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([])
  const [showPreview, setShowPreview] = useState(false)
  
  const [formData, setFormData] = useState<GenerateQuestionsRequest>({
    videoTitle: video.title,
    videoDescription: video.description || undefined,
    content: '',
    questionCount: 3,
    questionTypes: ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER'],
    difficulty: 'MEDIUM',
    provider: undefined
  })

  useEffect(() => {
    loadProviders()
  }, [])

  const loadProviders = async () => {
    try {
      const response = await aiService.getProviders()
      setAvailableProviders(response.providers)
      setHasAISupport(response.hasAISupport)
      
      // Set default provider
      if (response.providers.length > 0) {
        setFormData(prev => ({
          ...prev,
          provider: response.providers[0] as 'OPENAI' | 'CLAUDE'
        }))
      }
    } catch (error) {
      console.error('Failed to load AI providers:', error)
      setError('Failed to load AI configuration')
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'questionCount' ? parseInt(value) || 1 : value
    }))
  }

  const handleQuestionTypesChange = (type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER') => {
    setFormData(prev => ({
      ...prev,
      questionTypes: prev.questionTypes?.includes(type)
        ? prev.questionTypes.filter(t => t !== type)
        : [...(prev.questionTypes || []), type]
    }))
  }

  const handleGenerate = async () => {
    if (!formData.content.trim()) {
      setError('Content is required to generate questions')
      return
    }

    if (!formData.questionTypes || formData.questionTypes.length === 0) {
      setError('At least one question type must be selected')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await aiService.generateQuestions(formData)
      setGeneratedQuestions(result.questions)
      setShowPreview(true)
    } catch (err: any) {
      console.error('Error generating questions:', err)
      setError(err.message || 'Failed to generate questions')
    } finally {
      setLoading(false)
    }
  }

  const handleApplyQuestions = async () => {
    if (!milestone) return

    setLoading(true)
    setError(null)

    try {
      await aiService.generateQuestionsForMilestone(milestone.id, {
        content: formData.content,
        questionCount: formData.questionCount,
        questionTypes: formData.questionTypes,
        difficulty: formData.difficulty,
        provider: formData.provider
      })

      onQuestionsGenerated()
    } catch (err: any) {
      console.error('Error applying questions:', err)
      setError(err.message || 'Failed to apply questions')
    } finally {
      setLoading(false)
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!hasAISupport) {
    return (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={handleBackdropClick}
      >
        <div className="bg-white rounded-lg max-w-md w-full">
          <div className="p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 text-gray-400">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Not Available</h3>
            <p className="text-gray-600 mb-6">
              AI question generation is not available. Please contact your administrator to configure AI providers.
            </p>
            <button onClick={onClose} className="btn-primary">
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">AI Question Generator</h2>
              <p className="text-sm text-gray-600 mt-1">
                Generate interactive questions using AI for: {video.title}
                {milestone && ` - ${milestone.title}`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <div className="flex">
                <svg className="w-5 h-5 text-red-400 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Configuration */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration</h3>
                
                {/* AI Provider */}
                <div className="mb-4">
                  <label htmlFor="provider" className="block text-sm font-medium text-gray-700 mb-2">
                    AI Provider
                  </label>
                  <select
                    id="provider"
                    name="provider"
                    value={formData.provider || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {availableProviders.map(provider => (
                      <option key={provider} value={provider}>
                        {provider === 'OPENAI' ? 'OpenAI GPT' : 'Anthropic Claude'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Question Count */}
                <div className="mb-4">
                  <label htmlFor="questionCount" className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Questions
                  </label>
                  <input
                    type="number"
                    id="questionCount"
                    name="questionCount"
                    value={formData.questionCount}
                    onChange={handleInputChange}
                    min="1"
                    max="10"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Difficulty */}
                <div className="mb-4">
                  <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-2">
                    Difficulty Level
                  </label>
                  <select
                    id="difficulty"
                    name="difficulty"
                    value={formData.difficulty}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>

                {/* Question Types */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Question Types
                  </label>
                  <div className="space-y-2">
                    {[
                      { key: 'MULTIPLE_CHOICE', label: 'Multiple Choice' },
                      { key: 'TRUE_FALSE', label: 'True/False' },
                      { key: 'SHORT_ANSWER', label: 'Short Answer' }
                    ].map(({ key, label }) => (
                      <label key={key} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.questionTypes?.includes(key as any) || false}
                          onChange={() => handleQuestionTypesChange(key as any)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Content */}
                <div>
                  <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                    Video Content/Transcript *
                  </label>
                  <textarea
                    id="content"
                    name="content"
                    value={formData.content}
                    onChange={handleInputChange}
                    placeholder="Paste the video transcript, key points, or content that questions should be based on..."
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    The AI will use this content to generate relevant questions
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={loading || !formData.content.trim()}
                  className={`btn-primary ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {loading ? 'Generating...' : 'Generate Questions'}
                </button>
              </div>
            </div>

            {/* Preview */}
            <div>
              {showPreview && generatedQuestions.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Generated Questions ({generatedQuestions.length})
                    </h3>
                    {milestone && (
                      <button
                        onClick={handleApplyQuestions}
                        disabled={loading}
                        className={`btn-primary ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {loading ? 'Adding...' : 'Add to Milestone'}
                      </button>
                    )}
                  </div>

                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {generatedQuestions.map((question, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900">Q{index + 1}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            question.type === 'MULTIPLE_CHOICE' 
                              ? 'bg-blue-100 text-blue-700'
                              : question.type === 'TRUE_FALSE'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {question.type.replace('_', ' ')}
                          </span>
                        </div>
                        
                        <h4 className="font-medium text-gray-900 mb-2">
                          {question.question}
                        </h4>
                        
                        {question.type === 'MULTIPLE_CHOICE' && question.options && (
                          <div className="space-y-1 mb-2">
                            {question.options.map((option, optIndex) => (
                              <div key={optIndex} className="flex items-center text-sm">
                                <div className={`w-2 h-2 rounded-full mr-2 ${
                                  option === question.correctAnswer ? 'bg-green-500' : 'bg-gray-300'
                                }`}></div>
                                <span className={option === question.correctAnswer ? 'font-medium text-green-700' : 'text-gray-600'}>
                                  {option}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {question.type !== 'MULTIPLE_CHOICE' && (
                          <div className="text-sm text-green-700 font-medium mb-2">
                            Correct: {question.correctAnswer}
                          </div>
                        )}
                        
                        {question.explanation && (
                          <p className="text-sm text-gray-600 italic">
                            Explanation: {question.explanation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!showPreview && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <div className="w-12 h-12 mx-auto mb-4 text-gray-400">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <p className="text-gray-500">
                    Generated questions will appear here
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}