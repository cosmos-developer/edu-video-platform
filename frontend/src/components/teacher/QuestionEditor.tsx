import React, { useState, useEffect } from 'react'
import { questionService } from '../../services/video'
import type { Milestone } from '../../services/video'
import { useVideoStateManager } from '../../contexts/VideoStateContext'
import { useVideoState } from '../../hooks/useVideoState'

interface QuestionEditorProps {
  milestone: Milestone
  videoId?: string
  onClose: () => void
  onQuestionsUpdated?: () => void  // Callback when questions are added/removed
}

export function QuestionEditor({ milestone, videoId, onClose, onQuestionsUpdated }: QuestionEditorProps) {
  const manager = useVideoStateManager()
  const { questions: allQuestions } = useVideoState(videoId)
  // Use questions from VideoStateManager, not local state
  const questions = allQuestions?.get(milestone.id) || []
  const [showAddForm, setShowAddForm] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewAnswer, setPreviewAnswer] = useState('')

  const [formData, setFormData] = useState({
    type: 'MULTIPLE_CHOICE' as 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER',
    question: '',
    explanation: '',
    correctAnswer: '',
    options: ['', '', '', ''] // For multiple choice
  })

  // Load video state if needed when component mounts
  useEffect(() => {
    if (videoId && !allQuestions) {
      // VideoStateManager will load the video data if not cached
      manager.loadVideo(videoId)
    }
  }, [videoId, allQuestions, manager])

  const resetForm = () => {
    setFormData({
      type: 'MULTIPLE_CHOICE',
      question: '',
      explanation: '',
      correctAnswer: '',
      options: ['', '', '', '']
    })
    setShowAddForm(false)
    setError(null)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleOptionChange = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((option, i) => i === index ? value : option)
    }))
  }

  const handleCorrectOptionChange = (optionText: string) => {
    setFormData(prev => ({
      ...prev,
      correctAnswer: optionText
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.question.trim()) {
      setError('Question text is required')
      return
    }

    if (!formData.correctAnswer.trim()) {
      setError('Correct answer is required')
      return
    }

    // Validate multiple choice
    if (formData.type === 'MULTIPLE_CHOICE') {
      const validOptions = formData.options.filter(opt => opt.trim())
      if (validOptions.length < 2) {
        setError('At least 2 options are required for multiple choice questions')
        return
      }
      if (!validOptions.includes(formData.correctAnswer)) {
        setError('Correct answer must match one of the options')
        return
      }
    }

    setLoading(true)
    setError(null)

    try {
      const response = await questionService.createQuestion({
        milestoneId: milestone.id,
        type: formData.type,
        question: formData.question,
        explanation: formData.explanation || undefined,
        correctAnswer: formData.correctAnswer,
        options: formData.type === 'MULTIPLE_CHOICE' 
          ? formData.options.filter(opt => opt.trim())
          : undefined
      })

      // Add question through VideoStateManager - will update all subscribers
      if (videoId) {
        await manager.addQuestion(videoId, milestone.id, response)
      }
      resetForm()
      // Notify parent that questions have been updated
      if (onQuestionsUpdated) {
        onQuestionsUpdated()
      }
    } catch (err: any) {
      console.error('Error adding question:', err)
      setError(err.message || 'Failed to add question')
    } finally {
      setLoading(false)
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
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
              <h2 className="text-xl font-bold text-gray-900">Manage Questions</h2>
              <p className="text-sm text-gray-600 mt-1">
                Milestone: {milestone.title} 
                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                  milestone.type === 'QUIZ' 
                    ? 'bg-red-100 text-red-700'
                    : milestone.type === 'CHECKPOINT'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {milestone.type}
                </span>
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Existing Questions */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Questions ({questions.length})
                </h3>
                {!showAddForm && (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="btn-primary"
                  >
                    Add Question
                  </button>
                )}
              </div>

              {loadingQuestions ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                  <p className="text-gray-500">Loading questions...</p>
                </div>
              ) : questions.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-gray-500 mb-4">No questions added yet</p>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="btn-primary"
                  >
                    Add First Question
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {questions.map((question: any, index: number) => (
                    <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
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
                      </div>
                      
                      <h4 className="font-medium text-gray-900 mb-2">
                        {question.text}
                      </h4>
                      
                      {question.type === 'MULTIPLE_CHOICE' && question.questionData?.options && (
                        <div className="space-y-1 mb-2">
                          {question.questionData.options.map((option: string, optIndex: number) => (
                            <div key={optIndex} className="flex items-center text-sm">
                              <div className={`w-2 h-2 rounded-full mr-2 ${
                                optIndex === question.questionData.correctAnswerIndex ? 'bg-green-500' : 'bg-gray-300'
                              }`}></div>
                              <span className={optIndex === question.questionData.correctAnswerIndex ? 'font-medium text-green-700' : 'text-gray-600'}>
                                {option}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {question.type === 'TRUE_FALSE' && (
                        <div className="text-sm text-green-700 font-medium mb-2">
                          Correct: {question.questionData?.correctAnswer ? 'True' : 'False'}
                        </div>
                      )}
                      
                      {question.type === 'SHORT_ANSWER' && question.questionData?.correctAnswers && (
                        <div className="text-sm text-green-700 font-medium mb-2">
                          Correct: {question.questionData.correctAnswers.join(', ')}
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
              )}
            </div>

            {/* Add Question Form */}
            <div>
              {showAddForm && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Add New Question</h3>
                    <button
                      onClick={resetForm}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                      <p className="text-red-700 text-sm">{error}</p>
                    </div>
                  )}

                  {/* Preview Toggle */}
                  <div className="flex items-center space-x-2 mb-4">
                    <button
                      type="button"
                      onClick={() => setShowPreview(false)}
                      className={`px-3 py-1 rounded-md text-sm transition-colors ${
                        !showPreview 
                          ? 'bg-blue-100 text-blue-700 border border-blue-200'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPreview(true)}
                      className={`px-3 py-1 rounded-md text-sm transition-colors ${
                        showPreview 
                          ? 'bg-blue-100 text-blue-700 border border-blue-200'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                      disabled={!formData.question.trim()}
                    >
                      Preview
                    </button>
                  </div>

                  {showPreview ? (
                    /* Question Preview */
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-4">
                        Preview: How students will see this question
                      </h4>
                      
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <h5 className="font-medium text-gray-900 mb-3">
                          {formData.question || 'Enter your question...'}
                        </h5>
                        
                        {formData.type === 'MULTIPLE_CHOICE' && (
                          <div className="space-y-2">
                            {formData.options.filter(opt => opt.trim()).map((option, index) => (
                              <label key={index} className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="preview-answer"
                                  value={option}
                                  checked={previewAnswer === option}
                                  onChange={(e) => setPreviewAnswer(e.target.value)}
                                  className="text-blue-600"
                                />
                                <span className="text-gray-700">{option}</span>
                              </label>
                            ))}
                          </div>
                        )}
                        
                        {formData.type === 'TRUE_FALSE' && (
                          <div className="space-y-2">
                            {['True', 'False'].map((option) => (
                              <label key={option} className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="preview-answer"
                                  value={option}
                                  checked={previewAnswer === option}
                                  onChange={(e) => setPreviewAnswer(e.target.value)}
                                  className="text-blue-600"
                                />
                                <span className="text-gray-700">{option}</span>
                              </label>
                            ))}
                          </div>
                        )}
                        
                        {formData.type === 'SHORT_ANSWER' && (
                          <input
                            type="text"
                            value={previewAnswer}
                            onChange={(e) => setPreviewAnswer(e.target.value)}
                            placeholder="Student will type their answer here..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        )}
                        
                        {/* Show feedback */}
                        {previewAnswer && (
                          <div className={`mt-3 p-3 rounded-md ${
                            previewAnswer === formData.correctAnswer
                              ? 'bg-green-50 border border-green-200'
                              : 'bg-red-50 border border-red-200'
                          }`}>
                            <div className="flex items-center space-x-2">
                              {previewAnswer === formData.correctAnswer ? (
                                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L10 10.414l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                              )}
                              <span className={`font-medium ${
                                previewAnswer === formData.correctAnswer ? 'text-green-700' : 'text-red-700'
                              }`}>
                                {previewAnswer === formData.correctAnswer ? 'Correct!' : 'Incorrect'}
                              </span>
                            </div>
                            {formData.explanation && (
                              <p className={`mt-2 text-sm ${
                                previewAnswer === formData.correctAnswer ? 'text-green-700' : 'text-red-700'
                              }`}>
                                {formData.explanation}
                              </p>
                            )}
                            {previewAnswer !== formData.correctAnswer && (
                              <p className="mt-2 text-sm text-red-700">
                                Correct answer: {formData.correctAnswer}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex justify-end space-x-2 mt-4">
                        <button
                          type="button"
                          onClick={() => setPreviewAnswer('')}
                          className="text-sm px-3 py-1 text-gray-500 hover:text-gray-700"
                        >
                          Clear Answer
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Question Type */}
                    <div>
                      <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                        Question Type
                      </label>
                      <select
                        id="type"
                        name="type"
                        value={formData.type}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                        <option value="TRUE_FALSE">True/False</option>
                        <option value="SHORT_ANSWER">Short Answer</option>
                      </select>
                    </div>

                    {/* Question Text */}
                    <div>
                      <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-1">
                        Question *
                      </label>
                      <textarea
                        id="question"
                        name="question"
                        value={formData.question}
                        onChange={handleInputChange}
                        placeholder="Enter your question here"
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    {/* Options for Multiple Choice */}
                    {formData.type === 'MULTIPLE_CHOICE' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Answer Options *
                        </label>
                        <div className="space-y-2">
                          {formData.options.map((option, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <input
                                type="radio"
                                name="correctAnswer"
                                value={option}
                                checked={formData.correctAnswer === option && option.trim() !== ''}
                                onChange={(e) => handleCorrectOptionChange(e.target.value)}
                                className="text-blue-600"
                                disabled={!option.trim()}
                              />
                              <input
                                type="text"
                                value={option}
                                onChange={(e) => handleOptionChange(index, e.target.value)}
                                placeholder={`Option ${index + 1}`}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Select the radio button for the correct answer
                        </p>
                      </div>
                    )}

                    {/* Correct Answer for True/False and Short Answer */}
                    {formData.type !== 'MULTIPLE_CHOICE' && (
                      <div>
                        <label htmlFor="correctAnswer" className="block text-sm font-medium text-gray-700 mb-1">
                          Correct Answer *
                        </label>
                        {formData.type === 'TRUE_FALSE' ? (
                          <select
                            id="correctAnswer"
                            name="correctAnswer"
                            value={formData.correctAnswer}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                          >
                            <option value="">Select correct answer</option>
                            <option value="True">True</option>
                            <option value="False">False</option>
                          </select>
                        ) : (
                          <input
                            type="text"
                            id="correctAnswer"
                            name="correctAnswer"
                            value={formData.correctAnswer}
                            onChange={handleInputChange}
                            placeholder="Enter the correct answer"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        )}
                      </div>
                    )}

                    {/* Explanation */}
                    <div>
                      <label htmlFor="explanation" className="block text-sm font-medium text-gray-700 mb-1">
                        Explanation (Optional)
                      </label>
                      <textarea
                        id="explanation"
                        name="explanation"
                        value={formData.explanation}
                        onChange={handleInputChange}
                        placeholder="Explain why this is the correct answer"
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={resetForm}
                        className="btn-secondary"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className={`btn-primary ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {loading ? 'Adding...' : 'Add Question'}
                      </button>
                    </div>
                  </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}