

import { useState } from 'react'
import './App.css'

function App() {
  
function handleAnswerChange(event) {
  setAnswers((previousAnswers) => ({
    ...previousAnswers,
    [currentQuestionIndex]: event.target.value,
  }))
}

function handleNextQuestion() {
  if (currentQuestionIndex < questions.length - 1) {
    setCurrentQuestionIndex((previousIndex) => previousIndex + 1)
  } else {
    setInterviewFinished(true)
  }
}

  const [role, setRole] = useState('Software Engineer')
  const [level, setLevel] = useState('Fresher')
  const [techStack, setTechStack] = useState('Java')
  const [questionCount, setQuestionCount] = useState('5')

  // Store questions returned by the backend
  const [questions, setQuestions] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [interviewFinished, setInterviewFinished] = useState(false)

  
async function handleStartInterview(event) {
  event.preventDefault()

  const interviewConfig = {
    role,
    level,
    techStack,
    questionCount: Number(questionCount),
  }

  const controller = new AbortController()

  const timeoutId = setTimeout(() => {
    controller.abort()
  }, 30000)

  setIsLoading(true)
  setQuestions([])
  setCurrentQuestionIndex(0)
  setAnswers({})
  setInterviewFinished(false)

  try {
    const response = await fetch(
      'http://localhost:5000/api/interview/questions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: interviewConfig.role,
          difficulty: interviewConfig.level,
          techStack: interviewConfig.techStack,
          questionCount: interviewConfig.questionCount,
        }),
        signal: controller.signal,
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Failed to get questions')
    }

    setQuestions(data.questions)
  } catch (error) {
    console.error('Error fetching interview questions:', error)

    if (error.name === 'AbortError') {
      alert(
        'Question generation is taking too long. Please try again.'
      )
    } else {
      alert(error.message || 'Could not load interview questions.')
    }
  } finally {
    clearTimeout(timeoutId)
    setIsLoading(false)
  }
}


  return (
    <div className="app">
      <header className="app-header">
        <h1>InterviewMate</h1>
        <p>Your AI-powered mock interview platform</p>
      </header>

      <main className="container">
        <section className="interview-card">
          <h2>Configure Your Interview</h2>
          <p>Choose your preferences to get started.</p>

          <form onSubmit={handleStartInterview}>
            
<label htmlFor="role">Job Role</label>
<input
  id="role"
  type="text"
  list="job-roles"
  placeholder="Type or choose a job role"
  value={role}
  onChange={(event) => setRole(event.target.value)}
  required
/>

<datalist id="job-roles">
  <option value="Software Engineer" />
  <option value="Java Developer" />
  <option value="Python Developer" />
  <option value="Frontend Developer" />
  <option value="Backend Developer" />
  <option value="Full Stack Developer" />
  <option value="Data Analyst" />
  <option value="Data Scientist" />
  <option value="Machine Learning Engineer" />
  <option value="DevOps Engineer" />
  <option value="Cloud Engineer" />
  <option value="Cybersecurity Analyst" />
  <option value="Software Tester" />
  <option value="Android Developer" />
  <option value="AI Engineer" />
</datalist>


            <label htmlFor="level">Experience Level</label>
            <select
              id="level"
              value={level}
              onChange={(event) => setLevel(event.target.value)}
            >
              <option value="Fresher">Fresher</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Experienced">Experienced</option>
            </select>

            <label htmlFor="techStack">Technology</label>
            <select
              id="techStack"
              value={techStack}
              onChange={(event) => setTechStack(event.target.value)}
            >
              <option value="Java">Java</option>
              <option value="Python">Python</option>
              <option value="JavaScript">JavaScript</option>
              <option value="C">C</option>
            </select>

            <label htmlFor="questionCount">Number of Questions</label>
            <select
              id="questionCount"
              value={questionCount}
              onChange={(event) =>
                setQuestionCount(event.target.value)
              }
            >
              <option value="5">5 Questions</option>
              <option value="10">10 Questions</option>
              <option value="15">15 Questions</option>
            </select>

            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Loading Questions...' : 'Start Interview'}
            </button>
          </form>
        </section>

        
{questions.length > 0 && (
  <section className="questions-section">
    {!interviewFinished ? (
      <>
        <h2>Your Mock Interview</h2>

        <p>
          Role: {role} | Level: {level} | Technology: {techStack}
        </p>

        <p>
          Question {currentQuestionIndex + 1} of {questions.length}
        </p>

        <h3>{questions[currentQuestionIndex]}</h3>

        <label htmlFor="answer">Your Answer</label>
        <textarea
          id="answer"
          rows="6"
          placeholder="Write your answer here..."
          value={answers[currentQuestionIndex] || ''}
          onChange={handleAnswerChange}
        />

        <button type="button" onClick={handleNextQuestion}>
          {currentQuestionIndex === questions.length - 1
            ? 'Finish Interview'
            : 'Next Question'}
        </button>
      </>
    ) : (
      <>
        <h2>Interview Completed!</h2>
        <p>
          You answered {questions.length} interview questions.
        </p>

        <h3>Your Answers</h3>
        <ol>
          {questions.map((question, index) => (
            <li key={`${index}-${question}`}>
              <p><strong>{question}</strong></p>
              <p>{answers[index] || 'No answer provided.'}</p>
            </li>
          ))}
        </ol>

        <button
          type="button"
          onClick={() => {
            setQuestions([])
            setAnswers({})
            setCurrentQuestionIndex(0)
            setInterviewFinished(false)
          }}
        >
          Start New Interview
        </button>
      </>
    )}
  </section>
)}

      </main>
    </div>
  )
}

export default App
