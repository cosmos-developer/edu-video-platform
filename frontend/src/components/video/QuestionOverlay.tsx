import { useState } from 'react'
import type { Milestone } from '../../services/video'

interface QuestionOverlayProps {
  milestone: Milestone
  onAnswerSubmit: (questionId: string, answer: string) => Promise<{ isCorrect: boolean; explanation?: string }>
  onComplete: () => void
}

export function QuestionOverlay({
  milestone,
  onAnswerSubmit,
  onComplete
}: QuestionOverlayProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean
    explanation?: string
    shown: boolean
  } | null>(null)
  const [completedQuestions, setCompletedQuestions] = useState<Set<number>>(new Set())

  const questions = milestone.questions || []
  const currentQuestion = questions[currentQuestionIndex]

  if (!currentQuestion) {
    return null
  }

  const handleSubmitAnswer = async () => {
    if (!selectedAnswer.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const result = await onAnswerSubmit(currentQuestion.id, selectedAnswer)
      setFeedback({
        isCorrect: result.isCorrect,
        explanation: result.explanation,
        shown: true
      })
      setCompletedQuestions(prev => new Set(prev).add(currentQuestionIndex))
    } catch (error) {
      console.error('Failed to submit answer:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
      setSelectedAnswer('')
      setFeedback(null)
    } else {
      onComplete()
    }
  }

  const handleOptionSelect = (option: string) => {
    if (feedback?.shown) return
    setSelectedAnswer(option)
  }

  const renderQuestionContent = () => {
    switch (currentQuestion.type) {
      case 'MULTIPLE_CHOICE':
        return (
          <div className="space-y-3">
            {currentQuestion.options?.map((option, _index) => (
              <button
                key={option.id}
                onClick={() => handleOptionSelect(option.text)}
                disabled={feedback?.shown}
                className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                  selectedAnswer === option.text
                    ? feedback?.shown
                      ? option.isCorrect
                        ? 'border-green-500 bg-green-50'
                        : 'border-red-500 bg-red-50'
                      : 'border-blue-500 bg-blue-50'
                    : feedback?.shown && option.isCorrect
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 hover:border-gray-400'
                } ${feedback?.shown ? 'cursor-default' : 'cursor-pointer hover:bg-gray-50'}`}
              >
                <div className="flex items-center">
                  <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                    selectedAnswer === option.text
                      ? feedback?.shown
                        ? option.isCorrect
                          ? 'border-green-500 bg-green-500'
                          : 'border-red-500 bg-red-500'
                        : 'border-blue-500 bg-blue-500'
                      : feedback?.shown && option.isCorrect
                        ? 'border-green-500 bg-green-500'
                        : 'border-gray-300'
                  }`}>
                    {(selectedAnswer === option.text || (feedback?.shown && option.isCorrect)) && (
                      <div className="w-full h-full rounded-full bg-white scale-50"></div>
                    )}
                  </div>
                  <span className="text-gray-800">{option.text}</span>
                </div>
              </button>
            )) || []}
          </div>
        )

      case 'TRUE_FALSE':
        return (
          <div className="space-y-3">
            {['True', 'False'].map((option) => (
              <button
                key={option}
                onClick={() => handleOptionSelect(option)}
                disabled={feedback?.shown}
                className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                  selectedAnswer === option
                    ? feedback?.shown
                      ? currentQuestion.correctAnswer.toLowerCase() === option.toLowerCase()
                        ? 'border-green-500 bg-green-50'
                        : 'border-red-500 bg-red-50'
                      : 'border-blue-500 bg-blue-50'
                    : feedback?.shown && currentQuestion.correctAnswer.toLowerCase() === option.toLowerCase()
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 hover:border-gray-400'
                } ${feedback?.shown ? 'cursor-default' : 'cursor-pointer hover:bg-gray-50'}`}
              >
                <div className="flex items-center">
                  <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                    selectedAnswer === option
                      ? feedback?.shown
                        ? currentQuestion.correctAnswer.toLowerCase() === option.toLowerCase()
                          ? 'border-green-500 bg-green-500'
                          : 'border-red-500 bg-red-500'
                        : 'border-blue-500 bg-blue-500'
                      : feedback?.shown && currentQuestion.correctAnswer.toLowerCase() === option.toLowerCase()
                        ? 'border-green-500 bg-green-500'
                        : 'border-gray-300'
                  }`}>
                    {(selectedAnswer === option || (feedback?.shown && currentQuestion.correctAnswer.toLowerCase() === option.toLowerCase())) && (
                      <div className="w-full h-full rounded-full bg-white scale-50"></div>
                    )}
                  </div>
                  <span className="text-gray-800">{option}</span>
                </div>
              </button>
            ))}
          </div>
        )

      case 'SHORT_ANSWER':
        return (
          <div>
            <textarea
              value={selectedAnswer}
              onChange={(e) => setSelectedAnswer(e.target.value)}
              disabled={feedback?.shown}
              placeholder="Type your answer here..."
              className="w-full p-3 border rounded-lg resize-none h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full m-4 max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{milestone.title}</h2>
              <p className="text-sm text-gray-600 mt-1">
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
            </div>
            <div className="flex space-x-1">
              {questions.map((_, index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full ${
                    index === currentQuestionIndex
                      ? 'bg-blue-500'
                      : completedQuestions.has(index)
                      ? 'bg-green-500'
                      : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Question */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {currentQuestion.question}
            </h3>
            {renderQuestionContent()}
          </div>

          {/* Feedback */}
          {feedback?.shown && (
            <div className={`p-4 rounded-lg mb-6 ${
              feedback.isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center mb-2">
                {feedback.isCorrect ? (
                  <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
                <span className={`font-semibold ${
                  feedback.isCorrect ? 'text-green-800' : 'text-red-800'
                }`}>
                  {feedback.isCorrect ? 'Correct!' : 'Incorrect'}
                </span>
              </div>
              {feedback.explanation && (
                <p className={`text-sm ${
                  feedback.isCorrect ? 'text-green-700' : 'text-red-700'
                }`}>
                  {feedback.explanation}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between">
            <div className="text-sm text-gray-500">
              {milestone.description}
            </div>
            
            <div className="flex space-x-3">
              {!feedback?.shown ? (
                <button
                  onClick={handleSubmitAnswer}
                  disabled={!selectedAnswer.trim() || isSubmitting}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    selectedAnswer.trim() && !isSubmitting
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Answer'}
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Continue Video'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}